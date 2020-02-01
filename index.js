const app = require('express')(),
    bodyParser = require('body-parser'),
    aws = require('aws-sdk'),
    fs = require('fs'),
    chalk = require('chalk');;

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
                if (data) {
                    resolve(data);
                } else {
                    resolve(false)
                }
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
            if (Object.keys(result).length == 0) {
                resolve(true)
                res.send({ response: "failure", message: `Invalid User` })
            } else {
                if (result.Item.password === req.body.password) {
                    resolve(true)
                    res.send({ response: "success", message: `Welcome ${result.Item.name}` })
                } else {
                    reject(true)
                    res.send({ response: "failure", message: `Invalid Password` })
                }
            }
        }).catch(error => {
            console.log(chalk.red("Error occurred : ", error))
            reject(error)
        })
    })
})

app.listen(8000, () => {
    console.log(chalk.inverse.green(`Server is listening on Port 8000`));
});

