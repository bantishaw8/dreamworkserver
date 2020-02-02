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
                resolve({ response: "success", message: `Account created successfully` });
            }
        });
    })
};

/**
 * Request Body
 * {
        "password" : "123456",
        "phone":89613234490
    }
 */
app.post('/loginUser', (req, res) => {
    let filter = {
        TableName: "loginDetails",
        Key: {
            mobile: req.body.phone
        }
    }
    getOperation(filter).then((result) => {
        if (Object.keys(result).length == 0) {
            res.send({ response: "failure", message: `This Number does not exist` })
        } else {
            if (result.Item.password === req.body.password) {
                res.send({ response: "success", message: `Welcome ${result.Item.firstName} ${result.Item.lastName}` })
            } else {
                res.send({ response: "failure", message: `Invalid Password` })
            }
        }
    }).catch(error => {
        console.log(chalk.red("Error occurred : ", error))
        res.send({ response: "failure", message: error })
    })
})


/**
 * Request Body
 * {
        "fname" : "Banti",
        "sname": "Shaw",
        "password" : "123456",
        "email": "bantishaw9@live.com",
        "phone":89613234490
    }
 */
app.post('/register', (req, res) => {
    let putfilter = {
        TableName: "loginDetails",
        Item: {
            firstName: req.body.fname,
            lastName: req.body.sname,
            mobile: req.body.phone,
            email: req.body.email,
            password: req.body.password
        }
    };
    let filter = {
        TableName: "loginDetails",
        Key: {
            mobile: req.body.phone
        }
    }
    getOperation(filter)
        .then(result => {
            if (Object.keys(result).length == 0) {
                return putOperation(putfilter);
            } else {
                return { response: "success", message: `This Number already exists` }
            }
        }).then((response) => {
            return res.send(response)
        }).catch(error => {
            console.log(chalk.red("Error in Register Operation :", error))
            res.send({ response: "failure", message: error })
        })
})

app.listen(8000, () => {
    console.log(chalk.inverse.green(`Server is listening on Port 8000`));
});

