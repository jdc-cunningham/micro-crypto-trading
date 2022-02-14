### Micro Crypto Trading
Disclaimer: I am not an expert, this is just a fun hobby thing for this > blog post < (update)
Disclaimer: Also note the local portfolio balance tracker can lose/gain cents over time due to rounding problems.

### Stack
- web app
  - Plain JS and ChartJS
- API
  - NodeJS and ExpressJS ran with pm2 
  - data stored as JSON files no db
- Scheduler
  - CRON 5-min intervals mostly due to limited CMC API calls

### Data/Trading/Algo
- CoinMarketCap for price info (using free api key 333 calls per day)
- Coinbase Pro for actual trades
- no algo, just buy/hold sell if at least 2% gain

### What's in here?
* price check by CMC
* portfolio listing, buying/selling, trade statuses on CBP
* error logging to file/displayed on chart front end

The prices are checked every 5 minutes and is charted by the day (timestamps)

### Did this make money?
ANSWER - I ran this and checked in weekly increments

### Tips
- mock out the endpoints and call against that until the "algo" or "scheduled-job script" works well

### Note
The pi branch is the actual code that ran, it may be slightly out of sync but the only difference should be the included full paths for CRON to work correctly.