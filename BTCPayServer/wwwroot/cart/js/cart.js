function Cart() {
    this.items = 0;
    this.totalAmount = 0;
    this.content = [];
    this.tip = 0;

    this.loadLocalStorage();
    this.itemsCount();
    this.listItems();
    this.updateAmount();
}

Cart.prototype.addItem = function(item) {
    // Increment the existing item count
    var result = this.content.filter(function(obj){
        if (obj.id === item.id){
            obj.count++;
        }
        
        return obj.id === item.id
    });

    // Add new item because it doesn't exist yet
    if (!result.length) {
        this.content.push({id: item.id, title: item.title, price: item.price, count: 1, image: item.image})
    }

    this.items++;
    this.saveLocalStorage();
    this.itemsCount();
    this.updateTotal();
    this.updateAmount();
}

Cart.prototype.decrementItem = function(id) {
    var self = this;

    // Decrement the existing item count
    this.content.filter(function(obj, index, arr){
        if (obj.id === id)
        {
            obj.count--;

            // It's the last item with the same ID, remove it
            if (obj.count === 0) {
                self.removeItem(id, index, arr);
            }
        }
    });

    this.items--;
    this.saveLocalStorage();
    this.itemsCount();
    this.updateTotal();
    this.updateAmount();
    
    if (this.items === 0) {
        this.emptyList();
    }
}

Cart.prototype.removeItemAll = function(id) {
    var self = this;

    this.content.filter(function(obj, index, arr){
        if (obj.id === id)
        {
            self.removeItem(id, index, arr);

            for (var i = 0; i < obj.count; i++) {
                self.items--;
            }
        }
    });

    this.saveLocalStorage();
    this.itemsCount();
    this.updateTotal();
    this.updateAmount();
    
    if (this.items === 0) {
        this.emptyList();
    }
}

Cart.prototype.removeItem = function(id, index, arr) {
    // Remove from the array
    arr.splice(index, 1); 
    // Remove from the DOM
    $('#js-cart-list').find('tr').eq(index+1).remove();
}

Cart.prototype.setTip = function(tip) {
    return this.tip = tip;
}

Cart.prototype.itemsCount = function() {
    $('#js-cart-items').text(this.items);
}

Cart.prototype.getTotal = function(plain) {
    this.totalAmount = 0;

    // Always calculate the total amount based on the cart content
    for (var key in this.content) {
        if (this.content.hasOwnProperty(key) && typeof this.content[key] != 'undefined') {
            var price = this.toCents(this.content[key].price.value);
            this.totalAmount += (this.content[key].count * price);
        }
    }

    this.totalAmount += this.toCents(this.tip);

    return this.fromCents(this.totalAmount);
}

Cart.prototype.updateTotal = function() {
    $('#js-cart-total').text(this.formatCurrency(this.getTotal(), srvModel.currencyCode, srvModel.currencySymbol));
}

Cart.prototype.updateAmount = function() {
    $('#js-cart-amount').val(this.getTotal());
}

Cart.prototype.escape = function(input) {
    return ('' + input) /* Forces the conversion to string. */
        .replace(/&/g, '&amp;') /* This MUST be the 1st replacement. */
        .replace(/'/g, '&apos;') /* The 4 other predefined entities, required. */
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    ;
}

Cart.prototype.listItems = function() {
    var $table = $('#js-cart-list').find('tbody'),
        self = this,
        list = [],
        tableTemplate = '';
    
    if (this.content.length > 0) {
        // Prepare the list of items in the cart
        for (var key in this.content) {
            var item = this.content[key],
                id = this.escape(item.id),
                title = this.escape(item.title),
                image = this.escape(item.image),
                count = this.escape(item.count),
                price = this.escape(item.price.formatted),
                total = this.escape(this.formatCurrency(this.getTotal(), srvModel.currencyCode, srvModel.currencySymbol)),
                step = this.escape(srvModel.step),
                tip = this.escape(this.tip || ''),
                customTipText = this.escape(srvModel.customTipText);

            tableTemplate = '<tr data-id="' + id + '">' + 
                        (image !== null ? '<td class="align-middle pr-0" width="60"><img src="' + image + '" width="100%"></td>' : '') +
                        '<td class="align-middle pr-0"><b>' + title + '</b></td>' +
                        '<td class="align-middle pr-0" align="right"><div class="input-group">' +
                        '   <input class="js-cart-item-count form-control form-control-sm pull-left" type="number" min="0" step="1" name="count" placeholder="Qty" value="' + count + '" data-prev="' + count + '">' +
                        '   <div class="input-group-append"><a class="js-cart-item-remove btn btn-danger btn-sm" href="#"><i class="fa fa-remove"></i></a></div>' + 
                        '</div></td>' +
                        '<td class="align-middle" align="right">' + price + '</td>' +
                        '</tr>';
            list.push($(tableTemplate));
        }

        tableTemplate = '<tr><td colspan="4"><div class="row"><div class="col-sm-7 py-2">' + customTipText + '</div><div class="col-sm-5">' +
    '<div class="input-group">' + 
        '<div class="input-group-prepend">' +
            '<span class="input-group-text"><i class="fa fa-money"></i></span>' +
        '</div>' +
        '<input class="js-cart-tip form-control" type="number" min="0" step="' + step + '" value="' + tip + '" name="tip" placeholder="Amount">' +
    '</div>' +
    '</div></div></td></tr>';
        list.push($(tableTemplate));

        tableTemplate = '<tr class="bg-light h4"><td colspan="1">Total</td><td colspan="3" align="right"><span id="js-cart-total">' + total + '</span></td></tr>';
        list.push($(tableTemplate));

        // Add the list to DOM
        $table.html(list);

        // Update the cart when number of items is changed
        $('.js-cart-item-count').off().on('input', function(event){
            var _this = this,
                id = $(this).closest('tr').data('id'),
                count = parseInt($(this).val()),
                prevCount = parseInt($(this).data('prev')),
                increased = count > prevCount;
            
            // User hasn't inputed any number so stop here
            if (isNaN(count)) {
                return false;
            }

            $(this).data('prev', count);

            var item = self.content.filter(function(obj){
                return obj.id === id
            });
            
            // Must be in the loop because user may change the count manually by more than 1
            for (var i = 0; i < Math.abs(count - prevCount); i++) {
                if (increased) {
                    self.addItem({
                        id: id,
                        title: item.title,
                        price: item.price,
                        image: typeof item.image != 'underfined' ? item.image : null
                    });
                } else {
                    self.decrementItem(id);
                }
            }
        });

        // Remove item from the cart
        $('.js-cart-item-remove').off().on('click', function(event){
            event.preventDefault();

            var id = $(this).closest('tr').data('id');

            self.removeItemAll(id);
        });

        // Change total when tip is changed
        $('.js-cart-tip').off().on('input', function(event){
            self.setTip($(this).val());
            self.updateTotal();
            self.updateAmount();
        });
    } else { // No item in the cart
        self.emptyList();
    }
}

Cart.prototype.emptyList = function() {
    var $table = $('#js-cart-list').find('tbody');

    $table.html('<tr><td colspan="4">The cart is empty.</td></tr>');
}

Cart.prototype.formatCurrency = function(amount, currency, symbol) {
    var amt = '',
        thousandsSep = '',
        decimalSep = ''
        prefix = '',
        postfix = '',
        currencyName = currency.toLowerCase();

    // Currency symbols
    switch (currencyName) {
        case 'usd':
        case 'aud':
        case 'cad':
        case 'clp':
        case 'mxn':
        case 'nzd':
        case 'sgd':
            prefix = '$';
            break;
        case 'eur':
            postfix = ' €';
            break;
        case 'chf':
            prefix = 'CHF ';
            break;
        case 'gbp':
            prefix = '£';
            break;
        case 'jpy':
        case 'cny':
            prefix = '¥';
            break;
        case 'hkd':
            prefix = 'HK$';
            break;
        case 'ars':
        case 'cop':
            prefix = '$ ';
            break;
        case 'brl':
            prefix = 'R$ ';
            break;
        case 'bdt':
            postfix = '৳';
            break;
        case 'czk':
            postfix = ' Kč';
            break;
        case 'dkk':
            postfix = ' kr.';
            break;
        case 'huf':
            postfix = ' Ft';
            break;
        case 'hrk':
            postfix = ' HRK';
            break;
        case 'ils':
            postfix = ' ₪';
            break;
        case 'inr':
            prefix = '₹ ';
            break;
        case 'isk':
            postfix = ' ISK';
            break;
        case 'kzt':
            postfix = ' ₸';
            break;
        case 'myr':
            prefix = 'RM';
            break;
        case 'ngn':
            prefix = '₦';
            break;
        case 'nok':
            prefix = 'kr ';
            break;
        case 'php':
            prefix = '₱';
            break;
        case 'pen':
            prefix = 'S/';
            break;
        case 'pln':
            postfix = ' zł';
            break;
        case 'ron':
            postfix = ' RON';
            break;
        case 'rub':
            postifx = ' ₽';
            break;
        case 'sek':
            postfix = ' kr';
            break;
        case 'aed':
            prefix = 'د.إ. ‏';
            break;
        case 'egp':
            prefix = 'ج.م.‏';
            break;
        case 'irr':
            prefix = 'ریال';
            break;
        case 'pkr':
            prefix = ' ر';
            break;
        case 'sar':
            prefix = 'ر.س.‏';
            break;
        case 'try':
            prefix = '₺';
            break;
        case 'uah':
            postfix = ' ₴';
            break;
        case 'vnd':
            postfix = ' ₫';
            break;
        case 'zar':
            prefix = 'R';
            break;

        default:
            prefix = symbol || currency;
    }
    
    // Currency separators
    switch (currencyName) {
        case 'eur':
        case 'czk':
        case 'huf':
        case 'kzt':
        case 'nok':
        case 'pln':
        case 'rub':
        case 'sek':
        case 'uah':
        case 'zar':
            thousandsSep = ' ';
            decimalSep = ',';
            break;

        case 'chf':
            thousandsSep = '’';
            decimalSep = '.';
            break;

        case 'cop':
        case 'clp':
        case 'idr':
        case 'isk':
        case 'vnd':
            thousandsSep = '.';
            break;

        case 'jpy':
            thousandsSep = ',';
            break;
        
        case 'ars':
        case 'brl':
        case 'dkk':
        case 'hrk':
        case 'ron':
        case 'try':
            thousandsSep = '.';
            decimalSep = ',';
            break;

        case 'irr':
        case 'pkr':
            thousandsSep = '٬';
            break;

        case 'egp':
        case 'sar':
            thousandsSep = '٬';
            decimalSep = '٫';
            break;

        default:
            thousandsSep = ',';
            decimalSep = '.';
    }

    if (decimalSep !== '') {
        // Replace decimal separator
        amt = amount.toFixed(2).replace(/.(\d{2})$/g, decimalSep + '\$1');
    } else {
        // No decimal separator
        amt = amount.toString();
    }
    // Add currency sign and thousands separator
    amt = prefix + amt.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep) + postfix;

    return amt;
}

Cart.prototype.toCents = function(num) {
    return num * 100;
}

Cart.prototype.fromCents = function(num) {
    return num / 100;
}

Cart.prototype.saveLocalStorage = function() {
    localStorage.setItem('cart', JSON.stringify(this.content));
}

Cart.prototype.loadLocalStorage = function() {
    this.content = $.parseJSON(localStorage.getItem('cart')) || [];

    // Get number of cart items
    for (var key in this.content) {
        if (this.content.hasOwnProperty(key) && typeof this.content[key] != 'undefined' && this.content[key] != null) {
            this.items += this.content[key].count;
        }
    }
}

Cart.prototype.destroy = function() {
    localStorage.removeItem('cart');
    this.content = [];
    this.items = 0;
    this.totalAmount = 0;
    this.tip = 0;
}