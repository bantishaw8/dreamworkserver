const app = require('express')(),
    bodyParser = require('body-parser'),
    aws = require('aws-sdk'),
    chalk = require('chalk');

var env = process.env.NODE_ENV || 'development',
    config = require('./configuration')[env];

aws.config.update({
    region: config.dynamodb.region,
    endpoint: config.dynamodb.endpoint,
    accessKeyId: config.dynamodb.accessKeyId,
    secretAccessKey: config.dynamodb.secretAccessKey
})
var dynamodb = new aws.DynamoDB.DocumentClient();

module.exports = {
    searchUserInShoppingCart: function (phoneNumber, cartData) {
        const filter = {
            TableName: "shoppingCart",
            Key: {
                mobile: phoneNumber
            }
        }
        return new Promise((resolve, reject) => {
            this.getOperation(filter).then(result => {
                if (Object.keys(result).length == 0) {
                    resolve({ response: "failure", message: `Shopping Cart is Empty` })
                } else {
                    resolve({ response: "success", message: result.Item })
                }
            })
        })
    },
    searchUserWhileLogin: function (phoneNumber) {
        const filter = {
            TableName: "loginDetails",
            Key: {
                mobile: phoneNumber
            }
        }
        return new Promise((resolve, reject) => {
            this.getOperation(filter).then(result => {
                if (Object.keys(result).length == 0) {
                    reject({ response: "failure", message: `Number does not exist` })
                } else {
                    resolve(result.Item)
                }
            })
        })
    },

    getOperation: function (params) {
        return new Promise((resolve, reject) => {
            dynamodb.get(params, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    if (data) {
                        resolve(data);
                    } else {
                        resolve(false)
                    }
                }
            });
        })
    },

    scanOperation: function (params) {
        return new Promise((resolve, reject) => {
            dynamodb.scan(params, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        })
    },

    putOperation: function (params) {
        return new Promise((resolve, reject) => {
            dynamodb.put(params, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ response: "success", message: data });
                }
            });
        })
    },
    updateOperation: function (params) {
        return new Promise((resolve, reject) => {
            dynamodb.update(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        })
    },
}


