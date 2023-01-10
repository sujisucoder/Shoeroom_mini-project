const { response } = require('express');

const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const objectId = require('mongodb').ObjectId

module.exports = {
  doSignup: (userdata) => new Promise(async(resolve, reject) => {
  
    console.log(userdata);
    hashPassword = await bcrypt.hash(userdata.password, 10);
    userdata.password = hashPassword;
    delete userdata.confpassword;
   
    
    console.log(hashPassword);
     db.get().collection(collection.USER_COLLECTION).insertOne(userdata).then((data) => {
         resolve(data.insertedId);
     });
  }),

  doLogin: (userdata)=>{
    return new Promise(async(resolve, reject) => {
      let response ={}
      let loginStatus = false
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({email:userdata.email})
      if (user) {
        bcrypt.compare(userdata.password, user.password).then((status) => {
          if (status) {
            console.log("login successful");
            response.user = user
            response.status = true
            resolve(response)
          }else{
            console.log("login failed");
            resolve({status:false})
          }
      });
        
      }else{
        console.log("login failed");
        resolve({status:false})

      }
    })
  },


};
