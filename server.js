
var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var unirest = require('unirest');
var async = require('async');
var crypto = require('crypto')

//url format /subscriptions/:subscriptionId/resourceGroups/:resourceGroupName/providers/Microsoft.CustomProviders/resourceProviders/pagerDuty/services
var app = express();
app.use(bodyParser.json());
app.use(logErrors)

function logErrors (err, req, res, next) {
  console.error(err.stack)
  next(err)
}

//PagerDuty API config
const baseUrl = "https://api.pagerduty.com/"
const pdApiKey = process.env.PDTOKEN;
headers = {
  'Accept': 'application/vnd.pagerduty+json;version=2',
  'Authorization': 'Token token=' + pdApiKey,
  'Content-type': 'application/json'
}

// Initialize the app.
var server = app.listen(process.env.PORT || 8080, function () {
  var port = server.address().port;
  console.log("App now running on port", port);
});

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
  }

  
// list services
app.get("/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName/providers/Microsoft.CustomProviders/resourceProviders/pagerDuty/services",function(req,res){
  console.log("listing services...")
  async function listServices() {
    return new Promise(function(resolve, reject) {
      var serviceId;
      var url = baseUrl + "/services"
      var rp = require('request-promise');

      rp({
          method: 'GET',
          uri: url,
          headers: headers
          }).then(function (parsedBody) {
              console.log(parsedBody);
              var response = JSON.parse(parsedBody);
              var services = response.services;
              resolve(services) ;
          })
          .catch(function (err) {
              console.log(err);
              reject(err);         
          });
        });
      }
   async function invoke(){
      const serviceList = await listServices().then(function (serviceList) {
        console.log(serviceList)
        res.status(200).json(serviceList);
      })
      .catch(function (serviceList) {
        error_result = {
          statusCode: serviceList.statusCode,
          message: serviceList.message,
          error: serviceList.error
        }
        res.status(500).json(error_result);
      });
    }

    invoke();
});

//get service by name
app.get("/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName/providers/Microsoft.CustomProviders/resourceProviders/pagerDuty/services/:id", function(req,res){
  var subName = req.path.split('/')[2]
  var rgName = req.path.split('/')[4]
  var serviceName = req.path.split('/')[10]
  var serviceName = subName + "_" + rgName +"_" + serviceName;
  console.log("listing service by name: " + serviceName)
  async function getServiceByName(serviceName) {
    return new Promise(function(resolve, reject) {
      var serviceId;
      var url = baseUrl + "/services"
      var rp = require('request-promise');
      var match = false;
      rp({
          method: 'GET',
          uri: url,
          headers: headers
          }).then(function (parsedBody) {
              var response = JSON.parse(parsedBody);
              var services = response.services;
              for(var item of services) {
                if (item.name == serviceName){
                  match = true;
                  resolve(item);
                }
              }
              if (match == false)        {
                resolve(null)
              }
              
          })
          .catch(function (err) {
              console.log(err);
              reject(err);         
          });
        });
      }

   async function invoke(){
      const serviceBody = await getServiceByName(serviceName).then(function (serviceBody) {
        console.log(serviceBody)
        if (serviceBody != null){
          res.status(200).json(serviceBody);
        }else{
          res.status(404).send("Service name not found")
        }
      })
      .catch(function (serviceBody) {
        error_result = {
          statusCode: serviceBody.statusCode,
          message: serviceBody.message,
          error: serviceBody.error
        }
        res.status(500).json(error_result);
      });
    }

    invoke();
});

async function resolveServiceId(serviceName) {
  return new Promise(function(resolve, reject) {
    var service;
    var url = baseUrl + "/services"
    var rp = require('request-promise');

   rp({
        method: 'GET',
        uri: url,
        headers: headers
       }).then(function (parsedBody) {
            console.log(parsedBody);
            var response = JSON.parse(parsedBody);
            var services = response.services;
            for(var item of services) {
              if (item.name == serviceName){
                console.log("Service id = " + item.id);
                service = item;
              }
            }
            resolve(service) ;
        })
        .catch(function (err) {
            console.log(err);
            reject(service);         
        });
      });
  }
      


app.delete("/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName/providers/Microsoft.CustomProviders/resourceProviders/pagerDuty/services/:id", function(req,res){
  console.log("deleting service...")
  var subName = req.path.split('/')[2]
  var rgName = req.path.split('/')[4]
  var serviceName = req.path.split('/')[10]
  var serviceName = subName + "_" + rgName +"_" + serviceName;
  async function deleteService(serviceId) {
    console.log("Delete service with id: " + serviceId)
    return new Promise(function(resolve, reject) {
      var url = baseUrl + "/services/" + serviceId
      var rp = require('request-promise');
      rp({
          method: 'DELETE',
          uri: url,
          headers: headers
          }).then(function (parsedBody) {
              console.log(parsedBody);
              resolve(parsedBody) ;
          })
          .catch(function (err) {
              console.log(err.body)
              reject(err);         
          });
        });
      }
   async function invoke(){
      const service = await resolveServiceId(serviceName) ;
      console.log("my id is " + service.id)
      var serviceId = service.id;
      const delService = await deleteService(serviceId).then(function (deleteService) {
        res.status(200).send("Deleted");
      })
      .catch(function (deleteService) {
        error_result = {
          statusCode: deleteService.statusCode,
          message: deleteService.message,
          error: deleteService.error
        }
        if (statusCode = 404){
          res.status(204).send("Service does not exist.");
        }else{
          res.status(500).json(error_result);
        }
      });
    }

    invoke();
});
  
app.put("/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName/providers/Microsoft.CustomProviders/resourceProviders/pagerDuty/services/:id", function(req, res) {
    var date = new Date();
    var subName = req.path.split('/')[2]
    var rgName = req.path.split('/')[4]
    var serviceName = req.path.split('/')[10]
    var serviceName = subName + "_" + rgName +"_" + serviceName;
    var escalationPolicy = req.body.escalationPolicy;
    var description = req.body.description;
    var serviceUrgency = req.body.serviceUrgency;
    if (escalationPolicy == null){ escalationPolicy = "Default"}
    if (serviceUrgency == null ){ serviceUrgency = "high"}

    console.log("attempting to create or update service name: " + serviceName);
    
    var url = baseUrl + "services"

    async function resolvePolicyId(){
      return new Promise(function(resolve, reject) {
      var rp = require('request-promise');
      var url = baseUrl + "/escalation_policies";
      var escalationPolicyId = "PD5D5C3";
      
      rp({
          method: 'GET',
          uri: url,
          headers: headers
          }).then(function (parsedBody) {
              console.log(parsedBody);
              var response = JSON.parse(parsedBody);
              var policies = response.escalation_policies;
              for(var item of policies) {
                if (item.name == escalationPolicy){
                  console.log("Escalation policy id = " + item.id);
                  escalationPolicyId = item.id;
                }
              }
              resolve(escalationPolicyId) ;
          })
          .catch(function (err) {
              console.log(err);
              reject(escalationPolicyId);         
          });
        });
    }

    async function updateService(serviceBody){
      return new Promise(function(resolve, reject) {
        var url = baseUrl + "/services/" + serviceBody.id
        var rp = require('request-promise');
        var data = {service: {serviceBody}};
        rp({
            method: 'PUT',
            uri: url,
            headers: headers,
            body: data,
            json: true
            }).then(function (parsedBody) {
              console.log("Update success")
              console.log(parsedBody)
              resolve(parsedBody);
            })
            .catch(function (err) {
                console.log(err);
                reject(err);         
            });
          });
      }  
          
    async function createNewService(policyId){
      return new Promise(function(resolve, reject){
        var rp = require('request-promise');
        var url = baseUrl + "services"

        service_payload = {
          'service': {
              'name': serviceName,
              'description': description,
              'escalation_policy': {
                  'id': policyId,
                  'type': 'escalation_policy'
              },
              'type': "service",
              'auto_resolve_timeout': 14400,
              'acknowledgement_timeout': 1800,
                      "incident_urgency_rule": {
                      "type": "constant",
                      "urgency": serviceUrgency
                      }
              } 
            }
        console.log(service_payload)

        rp({
          method: 'POST',
          uri: url,
          body: service_payload,
          json: true,
          headers: headers
          }).then(function (parsedBody) {
            console.log(parsedBody)
            resolve(parsedBody);
          })
          .catch(function (err) {
            reject(err);
          });
        
      });
    }
    
      async function createOrUpdateService() {
      const service = await resolveServiceId(serviceName) ;
      const escalationPolicyId = await resolvePolicyId();

      if(service != null){
        console.log("Service is found by name, will update")
        var serviceId = service.id;
        service.name = serviceName;
        service.description = description;
        service.incident_urgency_rule = {type: 'constant', urgency: serviceUrgency}
        service.escalation_policy.id = escalationPolicyId;
        console.log("new config for PUT: ")
        console.log(service)     
        const update = await updateService(service).then(function (update) {
          console.log(update)
          res.status(200).json(update);
        })
        .catch(function (update) {
          error_result = {
            statusCode: update.statusCode,
            message: update.message,
            error: update.error
          }
          res.status(500).json(error_result);
        });
        
       }else{

        console.log("Service does not exist, creating.")
        const creation = await createNewService(escalationPolicyId).then(function (creation) {
          console.log(creation)
          res.status(200).json(creation);
        })
        .catch(function (creation) {
          error_result = {
            statusCode: creation.statusCode,
            message: creation.message,
            error: creation.error
          }
          res.status(500).json(error_result);
        });
   
      }
    }

    createOrUpdateService();

  });
  
//catch and log 404s
  app.get("/*", function (req, res) {
    console.log("Unhandled URI: " + req.path)
    res.status(404).send("Invalid url:" + req.path);
    //throw new Error("BROKEN"); // Express will catch this on its own.
  });