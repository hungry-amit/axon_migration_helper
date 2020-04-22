const express=require('express');
const session =require('express-session');
const body_parser=require ('body-parser');
const fetch=require('node-fetch');
const FormData=require('form-data');
const log4js=require('log4js');
const uuid=require('uuid/v4');
const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const https = require('https');

const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

const logger=log4js.getLogger();
const TTL=1000*60*1;//1 min
const app=express();
const logLevel='debug';
const config_group=[];

const jsonParser = body_parser.json();
const textParser = body_parser.text();

//middlewares

app.use(session({
		name: 'migration_session',
		secret: 'infa@123',
		genid: (req)=>uuid(),
		resave: false,
		saveUninitialized: false,
		cookie:{secure:false}
	}))
//app.use(body_parser.text());

//app.set('view engine',ejs);
//handling root requests

app.get('/',(req,res)=>{
	res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
	res.status(200).send({"message":"Success"});

})
app.get('/getLog',textParser,(req,res)=>{
	//console.log(__dirname+'/migration'+req.session.id+'.log');
	res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
	res.sendFile(__dirname+'/migration'+req.session.id+'.log');
	req.session.destroy(err=>{
		console.log('Session Expired');
	})

})

//validate url
const validateURL=async (url)=>{
	return(await fetch(url,{
		method: 'GET',
		mode: 'CORS',
		timeout: 60000,
		agent: function (_parsedURL) {
	        if (_parsedURL.protocol == 'https:') {
	            return httpsAgent;
	        }
	        else{
	            return null;
	        }
	    }
	}));
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
		timeout: 60000,
		agent: function (_parsedURL) {
	        if (_parsedURL.protocol == 'https:') {
	            return httpsAgent;
	        }
	        else{
	            return null;
	        }
	    }
	}));
	//return (await response.text());
}

const getAbout=async(url)=>{
	const aboutUrl=url+'/about';
	const response=await fetch(aboutUrl,{
		method:"GET",
		credentials:"include",
		mode:"CORS",
		agent: function (_parsedURL) {
	        if (_parsedURL.protocol == 'https:') {
	            return httpsAgent;
	        }
	        else{
	            return null;
	        }
	    }
	});
	return (await response.text())
}

const getVersion=(about)=>{
	const start=about.indexOf("v.</span>");
	const end=about.indexOf("</span>",start+9)
	return(about.substring(start+10,end));
}


const getCsrfTokenPage=async (url,PHPSESSID)=>{
	const customizeConfigUrl=url+'/admin/customizeconfig';
	const response=await fetch(customizeConfigUrl,{
		method:"GET",
		credentials:"include",
		mode:"CORS",
		agent: function (_parsedURL) {
	        if (_parsedURL.protocol == 'https:') {
	            return httpsAgent;
	        }
	        else{
	            return null;
	        }
	    },
		headers:{
			cookie: `PHPSESSID=${PHPSESSID}`
		}
	});
	return (await response.text())
}

const getCsrfToken=(customizeconfig)=>{
	let dom = new JSDOM(customizeconfig)
	return(dom.window.document.getElementById("csrfToken").value);

}
//fetching current configuration

const getParameterdetails=async (url,PHPSESSID,UserJWT,id)=>{
	let get_url='';
	if(id==='0')
	{
		logger.info('Fetching Available System Settings')
		get_url=url+'/admin/getgrouplist';

	}
	else
	{
		logger.info(`Fetching parameters for: ${config_group[id-1]}`)
		get_url=url+'/admin/getparameterlist/'+id;
	}
	//console.log(get_url);
	return (await fetch(get_url,{
		method: 'GET',
		credentials: 'include',
		mode: 'CORS',
		redirect: 'manual',
		agent: function (_parsedURL) {
	        if (_parsedURL.protocol == 'https:') {
	            return httpsAgent;
	        }
	        else{
	            return null;
	        }
	    },
		headers:{
			cookie: `PHPSESSID=${PHPSESSID};UserJWT=${UserJWT}`
	}}));
	//return (await response.json());
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
	return(await fetch(update_url,{
		method: 'POST',
		credentials: 'include',
		mode: 'CORS',
		redirect: 'manual',
		body: req_body,
		agent: function (_parsedURL) {
	        if (_parsedURL.protocol == 'https:') {
	            return httpsAgent;
	        }
	        else{
	            return null;
	        }
	    },
		headers:{
			cookie: `PHPSESSID=${PHPSESSID};UserJWT=${UserJWT}`
	}}));
	//return (await response.text());
}

app.post('/getParameterdetails/:id',textParser,(req,res)=>{

	const req_body=JSON.parse(req.body);
	//console.log(req_body);
	getParameterdetails(req_body.url,req_body.sessId,req_body.token,req.params.id)
	.then(
		response=>{
			//console.log(response.status);
			if(response.status===200)
			{
				response.json().then(data=>{
					if(req.params.id==='0'){
						logger.info('Fetch Successful');
						logger.info('Received Data:');
						Object.values(data).map((field,index)=>{
							config_group[index]=field.text;
							logger.info(`${field.text}`)
					})
					}
					else{
						logger.info('Fetch Successful');
						logger.info('Received Data:');
						Object.values(data).map(field=>{
							logger.info(`${field.displayName}:${field.value}`)
						});	
					}
					res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
					res.send(data);

				})
				
			}
			else if(response.status===403)
			{
				logger.info('Fetch Failed');
				logger.error('Permission Denied');
				res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
				res.status(403).send({"message":"Permission Denied"});
			}
			else
			{
				logger.info('Fetch Failed');
				logger.error('Unable to contact Axon server at:'+req_body.url);
				res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
				res.status(404).send({"message":"Unable to contact Axon server"});
			}
			
		}
	)
	.catch(
		error=>{
			logger.error('Unable to contact Axon server at:'+req_body.url);
			logger.debug(error);
			res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
			res.status(500).send({"message":"Unable to contact Axon server"});
		}
	)
})

app.post('/updateParameterdetails/:id',textParser,(req,res)=>{

    const index=parseInt(req.params.id,10);
	const req_body=JSON.parse(req.body);
	let count=0;
	let log_entry='';
	//console.log(req_body);
	logger.info(`Migrating Configurations for ${config_group[index-1]}`);
	logger.info('Following configuration will be migrated:');
	(Object.values(req_body.data).map(field=>{
		count++;
		if(count%2===0)
		{
			logger.info(`${log_entry}:${field}`)
		}
		else
			log_entry=field;
	}));
	updateParameterdetails(req_body)
	.then(response=>{
		//console.log(data);
		if(response.status===200)
		{
			response.json().then(data=>{

				logger.info('Configuration migrated successfully');
				logger.info(data);
				res.set({'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials':true});
				res.send(data)
			});
		}
		else if(response.status===403)
		{
			logger.info('Fetch Failed');
			logger.error('Permission Denied');
			res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
			res.status(403).send({"message":"Permission Denied"});
		}
		else
		{
			logger.info('Fetch Failed');
			logger.error('Unable to contact Axon server at:'+req_body.url);
			res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
			res.status(404).send({"message":"Unable to contact Axon server"});
		}		

	})
	.catch(
		error=>{
			logger.error('Unable to contact Axon server at:'+req_body.url);
			logger.debug(error);
			res.set({'Access-Control-Allow-Origin': 'http://localhost:3000','Access-Control-Allow-Credentials':true});
			res.status(404).send({"message":"Unable to contact Axon server"});
		}
	)
})

const getCookies=(cookies,instance,version)=>
{
	let cookieObj={
		PHPSESSID: '',
		UserJWT: '',
		Version:'',
		instance: instance
	};
	cookieObj.Version=version;
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
	log4js.configure({
		appenders:{Authorization: {type: 'file',filename: 'migration'+req.session.id+'.log'}},
		categories:{default:{appenders:['Authorization'],level:logLevel}}
	})
	const {url,username,password,instance}=JSON.parse(req.body);
	//console.log(req.body);
	logger.info(`Validating ${instance} Axon URL: ${url}`);
	res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
	validateURL(url)
	.then(response=>{
		console.log(response.status);
		if(response.status===200)
		{
			//logger.info('URL validation completed successfully');
			//logger.info('Authenticating user:'+username);
			validateCredentials(url,username,password)
			.then(response=>{
				//console.log(document.cookie);//testing if both the required cookies are obtained
					//console.log(response.status);
					if(response.status===302)
					{
						getAbout(url).then(about=>{
							const version=getVersion(about);
							let token='';
							const cookies=response.headers.raw()['set-cookie'];
							const cookieObj=getCookies(cookies,instance,version);
							//console.log(cookieObj);
							if(cookieObj.UserJWT==='')
							{
								logger.error('Authentication Failed');
								logger.info(`Unable to obtain token for ${instance} Axon instance`)
								res.sendStatus(401);
							}
							else
							{
								logger.info(`Authentication Successful`)
								logger.info(`Token obtained for ${instance} Axon instance`)
								if(!req.session.sessId)
								{
									req.session.sessId=cookieObj.PHPSESSID;
								}
								res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
								if(parseFloat(version)>=6.3)
								{
									getCsrfTokenPage(url,cookieObj.PHPSESSID).then(page=>{
										token=getCsrfToken(page);
										cookieObj.token=token;
										res.status(200).send(JSON.stringify(cookieObj));
										//console.log(page);
									})
								}
								else{
									res.status(200).send(JSON.stringify(cookieObj));
								}
							}
						})
						//console.log(cookies);
							//console.log(cookieObj);
						
					}
					else if (response.status===404)
					{
						logger.error(`Unable to connect to ${instance} Axon login url: ${url}/login_check`)
						res.sendStatus(404);
					}
					
				}
			)
			.catch(error=>{
				logger.error('Internal Server Error');
				logger.debug(error);
				res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
				res.sendStatus(500);
			})
		}
		else{
			logger.error(`Unable to connect to ${instance} Axon login url: ${url}`)
			res.sendStatus(404);
		}
	})
	.catch(error=>{
		logger.info('URL validation completed with errors');
		logger.error('Unable to contact Axon server at:'+url);
		logger.debug(error);
		res.set({'Access-Control-Allow-Origin':'http://localhost:3000','Access-Control-Allow-Credentials':true});
		res.sendStatus(404);
	})	
})

app.listen(3001);