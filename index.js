const app = require('express')(),
    bodyParser = require('body-parser'),
    aws = require('aws-sdk'),
    fs = require('fs'),
    chalk = require('chalk');;

var env = process.env.NODE_ENV || 'development',
    config = require('./configuration')[env];

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

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
            // Give OTP
            res.send({response:"success", message : req.body.phone})
        }
    }).catch(error => {
        console.log(chalk.red("Error occurred : ", error))
        res.send({ response: "failure", message: error })
    })
})


/**
 * Request Body
 * {
        "phone":89613234490
    }
 */
app.post('/register', (req, res) => {
    let putfilter = {
        TableName: "loginDetails",
        Item: {
            mobile: req.body.phone
        }
    };
    if(req.body.referralCode) {
        putfilter.Item.referralCode = req.body.referralCode
    }
    let filter = {
        TableName: "loginDetails",
        Key: {
            mobile: req.body.phone
        }
    }
    getOperation(filter)
        .then(result => {
            if (Object.keys(result).length == 0) {
                //OTP
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

