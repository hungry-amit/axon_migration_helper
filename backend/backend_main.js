const express=require('express');
const session =require('express-session');
const body_parser=require ('body-parser');
const fetch=require('node-fetch');
const FormData=require('form-data');
const ejs=require('ejs');

const app=express();



//middlewares

app.use(body_parser.text());
app.set('view engine',ejs);
//handling root requests

app.get('/',(req,res)=>{
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
		redirect: 'manual'
	}));
	//return (await response.text());
}

app.post('/validateInput',(req,res)=>{
	const {url,username,password}=JSON.parse(req.body);
	console.log(req.body);
	validateURL(url)
	.then(response=>{
		validateCredentials(url,username,password)
		.then(response=>{
			//console.log(document.cookie);//testing if both the required cookies are obtained
			res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
			if(response.status!==302)
			res.send("Authentication Failure: "+response.status);
			else
			{ 
				console.log(response.status);
				console.log(response.headers.raw()['set-cookie']);
				response.text().then(data=>{
					//console.log(data);
					res.send(data)
				})
			}
		})
		.catch(error=>{
			res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
			res.send("Unable to contact server at the moment."+error)
		})
	})
	.catch(error=>{
		res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
		res.send("Invalid Axon URL:" + error)
	})	
})

app.listen(3001);