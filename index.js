const app = require('express')(),
    bodyParser = require('body-parser'),
    aws = require('aws-sdk'),
    fs = require('fs'),
    chalk = require('chalk'),
    request = require('request'),
    cryptoRandomString = require('crypto-random-string'),
    helper = require('./helperFunctions.js');

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
    helper.getOperation(filter).then((result) => {
        if (Object.keys(result).length == 0) {
            res.send({ response: "failure", message: `Number does not exist` })
        } else {
            // Give OTP
            res.send({ response: "success", message: req.body.phone })
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
    if (req.body.referralCode) {
        putfilter.Item.referralCode = req.body.referralCode
    }
    let filter = {
        TableName: "loginDetails",
        Key: {
            mobile: req.body.phone
        }
    }
    helper.getOperation(filter)
        .then(result => {
            if (Object.keys(result).length == 0) {
                //OTP
                return helper.putOperation(putfilter);
            } else {
                return { response: "failure", message: `Number already exists` }
            }
        }).then((response) => {
            return res.send(response)
        }).catch(error => {
            console.log(chalk.red("Error in Register Operation :", error))
            res.send({ response: "failure", message: error })
        })
})

app.get('/getLandingPage', (req, res) => {
    let filter = {
        TableName: "cards"
    }
    helper.scanOperation(filter)
        .then(results => {
            res.send({ response: "success", message: results.Items })
        })
})

/**
 * Request Body to search Products based on Category
 *  {
        "searchItem" : "CURD"
    }
 */
app.post('/searchCategoryProducts', (req, res) => {
    const params = {
        TableName: 'products',
    }
    return new Promise((resolve, reject) => {
        helper.scanOperation(params).then(results => {
            return findElementInArray(results.Items, req.body.searchItem)
        }).then(filterResults => {
            if (filterResults.length) {
                res.send({
                    response: "success",
                    message: filterResults,
                    productHeadImage: req.body.productHeadImage
                })
            } else {
                res.send({ response: "failure", message: `No Stock Available` })
            }
        })
    })
})

/**
 * Method to find Produts through filtering
 * @param {*} arrayItems 
 * @param {*} findItem 
 */
var findElementInArray = function (arrayItems, findItem) {
    let categogry = [];
    return new Promise((resolve, reject) => {
        arrayItems.forEach(result => {
            if (result.category === findItem) {
                categogry.push(result)
            }
        })
        resolve(categogry)
    })
}

app.post('/getGooglePlaces', (req, res) => {
    const requestObject = {
        uri: req.body.url,
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
    }
    let addressList = [];
    request(requestObject, function (error, response, body) {

        if (error) {
            throw error;
        }
        const resultBody = JSON.parse(body)
        resultBody.results.forEach(item => {
            addressList.push(item.name + ", ".concat(item.formatted_address))
        })
        res.send({ response: "success", message: addressList })
    });

})

app.post('/saveGoogleAddress', (req, res) => {
    const filter = {
        TableName: "loginDetails",
        Key: {
            mobile: req.body.phoneNumber
        }
    }
    helper.getOperation(filter).then(result => {
        if (Object.keys(result).length == 0) {
            res.send({ response: "failure", message: `Number does not exist` })
        } else {
            if (result.Item.address) {
                /**
                 * Update Selected Address field with the new Address and return
                 */
                const insertAddressObject = {
                    TableName: "loginDetails",
                    Key: {
                        mobile: req.body.phoneNumber
                    },
                    UpdateExpression: "set address.selectedAddress = :addressString",
                    ExpressionAttributeValues: {
                        ":addressString": req.body.address.selectedAddress
                    },
                    ReturnValues: "ALL_NEW"
                }
                helper.updateOperation(insertAddressObject).then((result) => {
                    res.send({ response: "success", message: result.Attributes.address })
                })

            } else {
                /**
                 * Create Address object and return
                 */
                const insertAddressObject = {
                    TableName: "loginDetails",
                    Key: {
                        mobile: req.body.phoneNumber
                    },
                    UpdateExpression: "set address = :addressObject",
                    ExpressionAttributeValues: {
                        ":addressObject": req.body.address
                    },
                    ReturnValues: "ALL_NEW"
                }
                helper.updateOperation(insertAddressObject).then((result) => {
                    res.send({ response: "success", message: result.Attributes.address })
                })
            }
        }
    })
})

app.post('/userProfileDetails', (req, res) => {
    const filter = {
        TableName: "loginDetails",
        Key: {
            mobile: req.body.phone
        }
    }
    helper.getOperation(filter).then(result => {
        if (Object.keys(result).length == 0) {
            res.send({ response: "failure", message: `Number does not exist` })
        } else {
            res.send({ response: "success", message: result.Item })
        }
    })
})

app.post('/saveAddress', (req, res) => {
    let insertAddressObject = {};
    helper.searchUserWhileLogin(req.body.phone)
        .then(result => {
            req.body.address.id = cryptoRandomString({ length: 10, type: 'base64' });
            if (result.address) {
                /**
                 * If Saved Location is already stored then add more address in that arrat
                 */
                if (result.address.savedAddress && result.address.savedAddress.length) {
                    result.address.savedAddress.push(req.body.address)
                    insertAddressObject = {
                        TableName: "loginDetails",
                        Key: {
                            mobile: req.body.phone
                        },
                        UpdateExpression: "set address.savedAddress = :addressObject",
                        ExpressionAttributeValues: {
                            ":addressObject": result.address.savedAddress
                        },
                        ReturnValues: "ALL_NEW"
                    }
                } else {
                    /**
                     * If there is no saved address then first create the saveAddress property
                     */
                    insertAddressObject = {
                        TableName: "loginDetails",
                        Key: {
                            mobile: req.body.phone
                        },
                        UpdateExpression: "set address.savedAddress = :addressObject",
                        ExpressionAttributeValues: {
                            ":addressObject": [req.body.address]
                        },
                        ReturnValues: "ALL_NEW"
                    }
                }
            } else {
                /**
                 * User has first time entered the App and he ia creating address 
                 * without selecting the current location
                 */
                insertAddressObject = {
                    TableName: "loginDetails",
                    Key: {
                        mobile: req.body.phone
                    },
                    UpdateExpression: "set address = :addressObject",
                    ExpressionAttributeValues: {
                        ":addressObject": {
                            savedAddress: [req.body.address]
                        }
                    },
                    ReturnValues: "ALL_NEW"
                }
            }

            helper.updateOperation(insertAddressObject).then((result) => {
                res.send({ response: "success", message: result.Attributes })
            })
        }).catch(error => {
            console.log("Error : ", error)
        })
})

app.post('/deleteAddress', (req, res) => {
    let insertAddressObject = {};
    helper.searchUserWhileLogin(req.body.phone)
        .then(result => {
            if (result.address.savedAddress && result.address.savedAddress.length) {
                const filteredData = result.address.savedAddress.filter(item => item.id !== req.body.address.id)
                insertAddressObject = {
                    TableName: "loginDetails",
                    Key: {
                        mobile: req.body.phone
                    },
                    UpdateExpression: "set address.savedAddress = :addressObject",
                    ExpressionAttributeValues: {
                        ":addressObject": filteredData
                    },
                    ReturnValues: "ALL_NEW"
                }
            }
            helper.updateOperation(insertAddressObject).then((result) => {
                res.send({ response: "success", message: result.Attributes })
            })
        }).catch(error => {
            console.log("Error : ", error)
        })
})

app.post('/checkoutCart', (req, res) => {
    console.log(req.body)
    let insertAddressObject = {};
    helper.searchUserWhileLogin(req.body.phone)
        .then(result => {
            console.log("user found")
            const shoppingFilter = {
                TableName: "shoppingCart",
                Key: {
                    mobile: req.body.phone
                }
            }
            return helper.searchUserInShoppingCart(req.body.phone, shoppingFilter)
        }).then(shoppingResult => {
            if (shoppingResult.response === 'failure') {
                /**
                 * User Cart Is Empty
                 */
                let cartData = {
                    TableName: "shoppingCart",
                    Item : {
                        mobile : req.body.phone,
                        products: req.body.products
                    }
                }
                helper.putOperation(cartData).then( cartResult => {
                    console.log("cartResult",cartResult)
                })
            } else {
                /**
                 * Cart is not Empty
                 */

            }
        }).catch(error => {
            console.log("Error : ", error)

        })
})

app.listen(8000, () => {
    console.log(chalk.inverse.green(`Server is listening on Port 8000`));
});

