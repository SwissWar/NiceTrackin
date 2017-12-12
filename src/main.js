$(document).ready(function() {
    
    // global var init
    var global = {
        timeInterval: 30,
        backgroundTimeInterval: 120,
        pool: "nicehash",
        currentCryptoExchange: "kreaken",
        currentCryptoCurrency: "BTC",
        latestResult: {},
        exchangeRate: {}
    };
    
    //addresses list init
    if(!Cookies.get("addresses")) {
        global.addressesList = [];
    } else {
        global.addressesList = $.parseJSON(Cookies.get("addresses"));
    }
    
    rivets.formatters.btc = function(value){
        return Math.round(value * 10000) / 10000
    }
    
    rivets.formatters.cryptoExchange = function(value){
        return Math.round((value * global.exchangeRate[global.currentCryptoCurrency]["USD"]) * 100) / 100
    }
    
    rivets.formatters.FIATCurrency = function(value){
        return Math.round(value * 100) / 100
    }
    
    rivets.formatters.status = function(value){
        if(value === true) return "Online"; return "Offline";
    }
    
    //init searchbar
    setTimeout(function () {
        $(document).load( "src/view/search.html", function (response) {
            $(".searchbar").fadeOut('fast', function() {
                $(".searchbar").html(response);
                
                //bind search events
                $("#trackButton").bind('click', function() {
                    track($("#btcAddress").val());
                }); 
                $('#btcAddress').bind("enterKey",function(e){
                    track($("#btcAddress").val());
                });
                $('#btcAddress').keyup(function(e){
                    if(e.keyCode == 13) {
                        $(this).trigger("enterKey"); 
                    }
                });
                
                $(".searchbar").fadeIn('slow');
            });
        });
    }, 2000);
    
    //track function
    function track (btcAddress, validationState) {
        if(!btcAddress) {
            searchBarError(1000);
        } else {
            if(typeof validationState == 'undefined'){
                toggleSearchState(true);
            }
            setTimeout( function() {
                if(validationState === true) {
                    addAddress(btcAddress);
                    loadTrackView(btcAddress);
                } else if (validationState === false) {
                    searchBarError(4000);
                } else {
                    addressValidateBTC(btcAddress);
                }
            }, 1000);
        }
    }
    
    //addAddress function
    function addAddress (Address) {
        var result = true;
        $.each(global.addressesList, function(key, val){
            if(val.address == Address) {
                result = false;
            }
        });
        if(result) {
            var json = { address: Address, type: 'btc', pool: 'nicehash' };
            global.addressesList.push(json);
            var stringifyList = JSON.stringify(global.addressesList);
            Cookies.set("addresses", stringifyList);
        }
    }
    
    function loadTrackView(btcAddress) {
        global.currentAddress = btcAddress;
        getCryptoExchange(global.currentCryptoCurrency, function(){
            getData(global.pool, function() {
                $(document).load( "src/view/track.html", function (response) {
                    $(".wrapper").fadeOut('fast', function() {
                        $('body').removeClass("searchBody");
                        $(".wrapper").html(response).removeClass("container valign-wrapper").fadeIn('slow');
                        $(".dropdown-button").dropdown();
                        rivets.bind($('body'), { global });
                        $('.tooltipped').tooltip({delay: 50});
                        global.timer = global.timeInterval;
                        timerRefresh();
                        global.backgroundTimer = global.backgroundTimeInterval;
                        backgroundTimerRefresh();
                        $('.timer').addClass('pulse');
                    });
                });
            });
        });
    }
    
    //validate btc address
    function addressValidateBTC(btcAddress) {
        return $.ajax({
            method: "GET",
            url: 'https://api.blockcypher.com/v1/btc/main/addrs/'+btcAddress+'/balance',
            success: function () {
                track(btcAddress, true);
            },
            error: function () {
                track(btcAddress, false);
            }
        });
    }
    
    function searchBarError(timeOut) {
        if($('.searchBarProgress').css('visibility') != 'hidden') {
            toggleSearchState(false);
        }
        $("#btcAddress").addClass("red lighten-4");
        setTimeout(function (){
            $("#btcAddress").removeClass("red lighten-4");
        }, timeOut);
    }
    
    function toggleSearchState(action) {
        if(action === true) {
            $('.searchBarProgress').animate({opacity: 1}, 300);
            $('#trackButton').addClass("disabled").removeClass("pulse");
            $("#btcAddress").attr("disabled", true);
        } else {
            $('.searchBarProgress').animate({opacity: 0}, 300); 
            $('#trackButton').removeClass("disabled").addClass("pulse");
            $("#btcAddress").removeAttr("disabled", true);
        }
    }
    
    function getData(pool, callback) {
        $.ajax({
            method: "GET",
            contentType: "application/json; charset=utf-8",
            dataType: "jsonp",
            timeout: 10000,
            url: 'https://api.nicehash.com/api?method=stats.provider.ex&addr='+global.currentAddress,
            success: function (data) {
                global.latestPoolData = data;
                global.apiStatus = true;
                updateView(function(){
                    if(typeof callback == "function")
                    callback();
                });
            },
            error: function () {
                global.apiStatus = false;
                Materialize.toast('Connection failure, API must be offline or down for maintenance. <br> Please wait until it goes back online.', 10000);
                if(typeof callback == "function")
                callback();
            }
        });
    }
    
    function timerRefresh() {
        if(global.timer > 0) {
            setTimeout(function() {
                global.timer--;
                timerRefresh();
            }, 1000);
        } else {
            $('.timer').removeClass('pulse');
            getData(global.pool, function() {
                global.timer = global.timeInterval;
                $('.timer').addClass('pulse');
                timerRefresh();
            });
        }
    }
    
    function updateView(callback) {
        
        // list active algo
        var activeAlgo = [];
        
        // current profitability & balance calculation & active algo
        var profitability = 0;
        var balance = 0;
        $.each(global.latestPoolData.result.current, function(key, val){
            if(val.data[0].a) {
                profitability += val.data[0].a * val.profitability;
                activeAlgo.push(val.algo);
            }
            balance += val.data[1] * 1;
        });
        global.latestResult.profitability = profitability;
        global.latestResult.balance = balance;
        console.log(global.latestResult);
        
        console.log(activeAlgo);
        
        // workers and hosts calculation
        $.each(activeAlgo, function(key,val) {
            console.log(val);
        });
            
        if(typeof callback == "function")
        callback();
    }
    
    function getCryptoExchange(currency, callback) {
        $.ajax({
            method: "GET",
            contentType: "application/json; charset=utf-8",
            timeout: 10000,
            url: 'https://min-api.cryptocompare.com/data/price?tsyms=USD,AUD,BRL,CAD,CHF,CLP,CNY,DKK,EUR,GBP,HKD,IDR,INR,ISK,JPY,KRW,NZD,PLN,RUB,SEK,SGD,THB,TWD,ZAR,PHP&fsym='+currency,
            success: function (data) {
                global.exchangeRate.BTC = data;
                console.log(global.exchangeRate[global.currentCryptoCurrency]);
                if(typeof callback == "function")
                callback();
            },
            error: function () {
                Materialize.toast("BTC price couldn't refresh, last price updated from API will be used.", 10000);
                if(typeof callback == "function")
                callback();
            }
        });
    }
    
    function backgroundTimerRefresh() {
        if(global.backgroundTimer > 0) {
            setTimeout(function() {
                global.backgroundTimer--;
                backgroundTimerRefresh();
            }, 1000);
        } else {
            console.log("whaat");
            getCryptoExchange(global.currentCryptoCurrency, function() {
                global.backgroundTimer = global.backgroundTimeInterval;
                backgroundTimerRefresh();
            });
        }
    }
    
});