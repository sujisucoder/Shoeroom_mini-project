
    function removeProduct(cartId,prodId,count){
        let quantity = parseInt(document.getElementById(prodId).innerHTML)
        count = parseInt(count)
        $.ajax({
            url:'/remove-product',
            data:{
                cart:cartId,
                product:prodId,
                count:count,
                quantity:quantity
            },
            method:'post',
            success:(response)=>{
                if(response.removeProduct){
                    alert("Product removed from cart")
                    location.reload()
                }else{
                    document.getElementById(prodId).innerHTML = quantity+count 
                }
  
            }

        })
    }