const { response } = require("../app")
const { ObjectId } = require('mongodb');
const db = require('../config/connection');
const collection = require('../config/collection');

const objectId = require('mongodb').ObjectId

module.exports = {

    doAdminLogin:(adminDetails)=>{
        return new Promise(async(resolve, reject) => {
          let  response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTON).findOne({email: adminDetails.email})
            console.log(admin);

            if (admin) {

                if (adminDetails.password == admin.password) {
                    response.admin = admin
                    response.status = true

                    resolve(response)
                    
                }else{
                    resolve({status:false})
                }
              
                
            }else{
                resolve({status:false})
            }

        })
    }
}
