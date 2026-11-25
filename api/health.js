module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'method_not_allowed'});
 const token=String(process.env.TELEGRAM_BOT_TOKEN||'').trim(),chat=String(process.env.TELEGRAM_CHAT_ID||'').trim();
 const result={ok:true,telegram:{configured:!!(token&&chat),valid:false,chatReachable:false,bot:null},admin:{configured:!!(process.env.ADMIN_PASSWORD&&process.env.ADMIN_SESSION_SECRET)},storage:{configured:!!process.env.BLOB_READ_WRITE_TOKEN}};
 if(token){try{const r=await fetch('https://api.telegram.org/bot'+token+'/getMe');const j=await r.json();result.telegram.valid=!!(r.ok&&j.ok);if(j.ok){result.telegram.bot=j.result.username;if(chat){const c=await fetch('https://api.telegram.org/bot'+token+'/getChat?chat_id='+encodeURIComponent(chat));const cj=await c.json();result.telegram.chatReachable=!!(c.ok&&cj.ok);if(!result.telegram.chatReachable)result.telegram.chatError=cj.error_code===400?'chat_not_found_or_bot_not_started':'chat_api_error'}}else result.telegram.error=j.error_code===401?'invalid_token':'telegram_api_error'}catch(e){result.telegram.error='network_error'}}
 return res.status(200).json(result);
};