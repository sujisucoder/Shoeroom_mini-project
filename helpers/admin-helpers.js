const { response } = require("../app")
const { ObjectId } = require('mongodb');
const db = require('../config/connection');
const collection = require('../config/collection');
// const { reject } = require("promise");

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
    },

    getUserCount:()=>{
        return new Promise(async(resolve, reject) => {
           await db.get().collection(collection.USER_COLLECTION).count().then((response)=>{
                resolve(response)
            })
        }).catch((err)=>{
            reject(err)
        })
    },

    getProductCount:()=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).count().then((response)=>{
                resolve(response)
            })
        }).catch((err)=>{
            reject(err)
        })
    },

    getOrderCount:()=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).count().then((response)=>{
               
                resolve(response)
            })
        }).catch((err)=>{
            reject(err)
        })
    },

    getSalesCount:()=>{
        return new Promise(async(resolve, reject) => {
        try {
          let total = await  db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: {$ne: 'order pending'} }
                },
                {
                    $project:{ totalAmount:1}
                },
                {
                    $group:{
                        _id : null,
                        total: {$sum: '$totalAmount'}
                    }
                }
            ]).toArray()
            resolve(total[0].total)
        } catch  {
            reject()
        }
        })
    },

    getAllUsers:()=>{
        return new Promise(async(resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
           
            resolve(users)
                
        })
        
    },

    blockUser:(userId)=>{
        return new Promise((resolve, reject) => {
             db.get().collection(collection.USER_COLLECTION).updateOne({_id: objectId(userId)},{
                
                $set:
                {
                    block: true
                } 
                
            }).then((response)=>{
                resolve()
            })
        })
    },

    unblockUser:(userId)=>{
        return new Promise(async(resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTION).updateOne({_id: objectId(userId)},{
                
                $set:
                {
                    block: false
                } 
                
            }).then((response)=>{
                
                resolve()
            })
        })
    },

    getSalesReport:()=>{
        return new Promise(async(resolve, reject) => {
            let sales = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(sales)
        })
    }
}
