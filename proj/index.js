const AWS = require('aws-sdk');
AWS.config.update({
	region: 'ap-south-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'users';

const healthPath = '/health';
const loginPath = '/login';
const regPath = '/register';
const allRecordPath = '/getrecords';
const getAge= '/getage';

exports.handler = async function(event){
	console.log('Request event: ', event);
	let response;
	switch(true){
		case event.httpMethod === 'GET' && event.path === healthPath:
			response = buildResponse(200);
			break;

		case event.httpMethod === 'POST' && event.path === loginPath:
			const email = event.queryStringParameters.email;
			const pass = event.queryStringParameters.password;
			console.log('I am here');
			response = await login(email, pass);
			break;

		case event.httpMethod === 'POST' && event.path === regPath:
			response = await register(JSON.parse(event.body));
			break;

		case event.httpMethod === 'GET' && event.path === allRecordPath:
			response = await getAllRecords();
			break;

		case event.httpMethod === 'GET' && event.path === getAge:
			const age = event.queryStringParameters.age;
			response = await getage(age);
			break;
	}
	return response;
}

async function login(email, pass){
	const params = {
		TableName: dynamodbTableName,
		Key:{
			"username": email
		}
	}
    
	var result = await dynamodb.get(params).promise();
	//console.log('Hello there');
	//console.log(result);
    
    const len = Object.keys(result).length;
    //console.log('Size of object is: ' + len);

    var respondeCode, body;

    if(len > 0 && result.Item.password === pass){
        respondeCode = 200;
        body = '{"Status": "Access Granted"}';
    }else if(len > 0 && result.Item.password != pass){
        respondeCode = 403;
        body = '{"Status": "Access not Granted"}';
    }else{
        respondeCode = 404;
        body = '{"Status": "User not found"}';
    }

    return buildResponse(respondeCode, JSON.parse(body));
}

async function register(requestBody){
	const params = {
		TableName: dynamodbTableName,
		Item: requestBody
	}
	return await dynamodb.put(params).promise().then(() => {
		const body = {
			Operation: 'SAVE',
			Message: 'SUCCESS',
			Item: requestBody
		}
		return buildResponse(200, JSON.parse('{"Status": "User Registered Successfully"}'));
	}, (error) => {
		console.error('Error Occured: ', error);
	})
}

async function getAllRecords(){
	const params = {
		TableName: dynamodbTableName
	}

	const allUsers = await scanRecords(params, []);
	const body = {
		users: allUsers
	}
	
	return buildResponse(200, body);
}
async function getage(age){
    const params = {
        TableName: dynamodbTableName,
        ExpressionAttributeNames:{
            '#age': 'age',
        },
        ExpressionAttributeValues:{
            ':age': age,
        },
        FilterExpression: '#age = :age'
    };
    
    const resultUsers = await scanRecords(params, []);    
    const body = {
    users: resultUsers
    }
    return buildResponse(200, body);
}


async function scanRecords(scanParams, userArray){
	try{
		const data = await dynamodb.scan(scanParams).promise();
		userArray = userArray.concat(data.Items);
		if(data.LastEvaluateKey){
			scanParams.ExclusiveStartkey = data.LastEvaluateKey;
			return await scanRecords(scanParams, userArray);
		}
		return userArray;
	}catch(error){
		console.error('Error Occured: ', error);
	}
}

function buildResponse(statusCode, body){
	return{
		statusCode: statusCode,
		headers:{
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		},
		body: JSON.stringify(body)
	}
}