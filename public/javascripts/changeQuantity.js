function changeQuantity(cartId, prodId, userId, count) {
    let quantity = parseInt(document.getElementById(prodId).innerHTML)
    count = parseInt(count)
    console.log(userId);
    $.ajax({
        url: '/change-product-quantity',
        data: {

            cart: cartId,
            product: prodId,
            user: userId,
            count: count,
            quantity: quantity
        },
        method: 'post',
        success: (response) => {
            if (response.removeProduct) {
                alert("Product removed from cart")
                location.reload()
            } else {
                document.getElementById(prodId).innerHTML = quantity + count;
                document.getElementById('totalValue').innerHTML = response.total;
            }

        }

    })
}

