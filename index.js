const app = require('express')(),
    bodyParser = require('body-parser'),
    aws = require('aws-sdk'),
    fs = require('fs');

var env = process.env.NODE_ENV || 'development',
    config = require('./configuration')[env];

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

aws.config.update({
    region: config.dynamodb.region,
    endpoint: config.dynamodb.endpoint,
    accessKeyId: config.dynamodb.accessKeyId,
    secretAccessKey: config.dynamodb.secretAccessKey
})
var dynamodb = new aws.DynamoDB.DocumentClient();

var scanOperation = function (params) {
    return new Promise((resolve, reject) => {
        dynamodb.scan(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
};

var getOperation = function (params) {
    return new Promise((resolve, reject) => {
        dynamodb.get(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
};

var putOperation = function (params) {
    return new Promise((resolve, reject) => {
        dynamodb.put(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
};

app.post('/loginUser', (req, res) => {
    let filter = {
        TableName: "loginDetails",
        Key: {
            mobile: req.body.mobile
        }
    }
    return new Promise((resolve, reject) => {
        getOperation(filter).then((result) => {
            console.log("result,", result)
            res.send(result)
        }).catch(error => {
            return reject(null, { response : error})
        })
    })
})

app.listen(8000)

