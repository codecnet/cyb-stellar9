import 'dotenv/config';
import mongoose from 'mongoose';
import https from 'https';
import axios from 'axios';
import { EncryptionUtils } from './utils/security.util.js';
await mongoose.connect(process.env.MONGODB_URI||process.env.MONGO_URI);
const db=mongoose.connection.db;
const o=await db.collection('organisations').findOne({client_name:'MMAD'});
const dec=v=>(v&&typeof v==='object'&&v.encrypted)?EncryptionUtils.decrypt(v):v;
const base='https://'+o.wazuh_manager_ip+':'+o.wazuh_manager_port;
const ax=axios.create({httpsAgent:new https.Agent({rejectUnauthorized:false}),timeout:30000});
const t=await ax.post(base+'/security/user/authenticate',{},{auth:{username:o.wazuh_manager_username,password:dec(o.wazuh_manager_password)}});
const H={headers:{Authorization:'Bearer '+t.data.data.token}};

console.log('=== existing mmad_noise_tuning.xml (your convention) ===');
const cur=await ax.get(base+'/rules/files/mmad_noise_tuning.xml?raw=true',H);
const txt=typeof cur.data==='string'?cur.data:JSON.stringify(cur.data);
console.log(txt.slice(0,1800));
console.log('\n  ... total length: '+txt.length+' chars');

console.log('\n=== original rule 91724 definition ===');
const src=await ax.get(base+'/rules/files/0755-office365_rules.xml?raw=true',H);
const s=typeof src.data==='string'?src.data:JSON.stringify(src.data);
const m=s.match(/<rule id="91724"[\s\S]*?<\/rule>/);
console.log(m?m[0]:'  not found');
