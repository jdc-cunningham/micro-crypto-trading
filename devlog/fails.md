Once I "turn the system on" barring any weird CRON-job file issues, I can't modify this code.

Have to let it run for a month and see if it survives, does it continue to trade on its own.

### Fails
02/12/2022
Sell price is not high enough odd

The logic was wrong to check if order was complete or should sell vs. buy as a result double buys (with left over money) or failed to buy

First CRON run after fixing path issues, it's trying to trade with not enough money

02/11/2022
I got rid of the test portfolio (another currency) before I waited for orders to complete/have a way to check/confirm.

Also not sure of the response values/need to pull them out.

This means I gotta use one of these portfolios and test, then reset its starting balane to $55 after I'm done.