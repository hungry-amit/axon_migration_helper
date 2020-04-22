const express=require('express');
const session =require('express-session');
const body_parser=require ('body-parser');
const fetch=require('node-fetch');
const FormData=require('form-data');
const ejs=require('ejs');

const app=express();

const jsonParser = body_parser.json();
const textParser = body_parser.text();

//middlewares

//app.use(body_parser.text());

app.set('view engine',ejs);
//handling root requests

app.get('/',textParser,(req,res)=>{
	res.send("Welcome to the backend server");
})

//validate url
const validateURL=async (url)=>{
	let response=await fetch(url,{
		method: 'GET',
		mode: 'CORS'
	});
	return (await response.text());
}

//validating credentials

const validateCredentials=async (url,username,password)=>{
	let req_body=new FormData();
	const login_check_url=url+'/login_check';
	req_body.append('_username',username);
	req_body.append('_password',password);
	return(await fetch(login_check_url,{
		method: 'POST',
		mode: 'CORS',
		credentials: 'include',
		body: req_body,
		redirect: 'manual',
		timeout: 60000
	}));
	//return (await response.text());
}

//fetching current configuration

const getParameterdetails=async (url,PHPSESSID,UserJWT,id)=>{
	let get_url='';
	if(id==='0')
	{
		get_url=url+'/admin/getgrouplist';
	}
	else
	{
		get_url=url+'/admin/getparameterlist/'+id;
	}
	//console.log(get_url);
	let response=await fetch(get_url,{
		method: 'GET',
		credentials: 'include',
		mode: 'CORS',
		redirect: 'manual',
		headers:{
			cookie: `PHPSESSID=${PHPSESSID};UserJWT=${UserJWT}`
	}});
	return (await response.json());
}

const updateParameterdetails=async (obj)=>{
	let url=obj.url;
	let UserJWT=obj.token;
	let PHPSESSID=obj.sessId;
	let update_url=url+'/admin/updateparametersvalue';
	let req_body=new FormData();
	Object.keys(obj.data).map(key=>{
		req_body.append(key,obj.data[key]);
	})
	//console.log(get_url);
	let response=await fetch(update_url,{
		method: 'POST',
		credentials: 'include',
		mode: 'CORS',
		redirect: 'manual',
		body: req_body,
		headers:{
			cookie: `PHPSESSID=${PHPSESSID};UserJWT=${UserJWT}`
	}});
	return (await response.text());
}

app.post('/getParameterdetails/:id',textParser,(req,res)=>{

	const req_body=JSON.parse(req.body);
	//console.log(req_body);
	getParameterdetails(req_body.url,req_body.sessId,req_body.token,req.params.id)
	.then(
		data=>{
			res.set({'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials':true});
			res.send(data);
		}
	)
})

app.post('/updateParameterdetails',textParser,(req,res)=>{

	const req_body=JSON.parse(req.body);
	//console.log(req_body);
	updateParameterdetails(req_body)
	.then(data=>{
		console.log(data);
		res.set({'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials':true});
		res.send(data);
	})
})

const getCookies=(cookies,instance)=>
{
	let cookieObj={
		PHPSESSID: '',
		UserJWT: '',
		instance: instance
	};
	cookies.map(cookie=>{
		if (cookie.startsWith("PHPSESSID"))
		{
			cookieObj.PHPSESSID=cookie.substring(cookie.indexOf("=")+1,cookie.indexOf(";"));
		}
		else if (cookie.startsWith("UserJWT"))
		{
			cookieObj.UserJWT=cookie.substring(cookie.indexOf("=")+1,cookie.indexOf(";"));
		}
	})
	return cookieObj;
}


app.post('/validateInput',textParser,(req,res)=>{
	const {url,username,password,instance}=JSON.parse(req.body);
	//console.log(req.body);
	validateURL(url)
	.then(response=>{
		validateCredentials(url,username,password)
		.then(response=>{
			//console.log(document.cookie);//testing if both the required cookies are obtained
				res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
				//console.log(response.status);
				if(response.status===302)
				{
					const cookies=response.headers.raw()['set-cookie'];
					const cookieObj=getCookies(cookies,instance);
					console.log(cookieObj);
					if(cookieObj.UserJWT==='')
						res.sendStatus(401);
					else
					{
						res.status(200).send(JSON.stringify(cookieObj));
					}
					//console.log(cookies);
						//console.log(cookieObj);
					
				}
				else if (response.status===404)
				{
					res.sendStatus(404);
				}
				
			}
		)
		.catch(error=>{
			res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
			res.sendStatus(500);
		})
	})
	.catch(error=>{
		res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
		res.sendStatus(404);
	})	
})

app.listen(3001);