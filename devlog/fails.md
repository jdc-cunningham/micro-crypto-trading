Once I "turn the system on" barring any weird CRON-job file issues, I can't modify this code.

Have to let it run for a month and see if it survives, does it continue to trade on its own.

### Fails
02/15/2022
This thing is a piece of crap, I have to turn it off, think about it from scratch
There is always something wrong later on after some transaction goes through

JSON becomes malformed due to some random thing appending to the entire object, can't figure out where it is

02/14/2022
LOOM has not bought for 45 mins since my code sucks because not parsing orderStatus right

Put logic in wrong spot

Cannot get IOTX to buy missed gain

Updating logic to trade since it didn't buy more after selling

New updates failing, maybe expecting wrong order status

02/13/2022
Stopped trading after recent changes, after sell went through

Turning off active trades and syncing portfolio_values.json

Really screwing it up, lots of errors now

Stuff is out of sync, chart is not displaying the right actual price vs. end order price

The transaction tracking is off... particularly with manually updated

No way to cancel current buy/buy back in, would just wait as price trippled

Had to manually cancel orders to get it to rebuy in, will add that in

Had to catch it up and fix the data

Some transactions are complete but not removing the tx id so it's not selling

The next sell price was missed, I had to cancel it so it would reach the closest sell price, for MDT

02/12/2022
Sell price is not high enough odd

The logic was wrong to check if order was complete or should sell vs. buy as a result double buys (with left over money) or failed to buy

First CRON run after fixing path issues, it's trying to trade with not enough money

02/11/2022
I got rid of the test portfolio (another currency) before I waited for orders to complete/have a way to check/confirm.

Also not sure of the response values/need to pull them out.

This means I gotta use one of these portfolios and test, then reset its starting balane to $55 after I'm done.