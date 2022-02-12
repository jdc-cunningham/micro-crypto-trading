// global localApiServerIpPort

// this object has a reference to all instantiated Charts
const charts = {};

// https://stackoverflow.com/a/2013332/2710227
const getTodaysDate = () => {
  const dateObj = new Date();
  const month = dateObj.getUTCMonth() + 1; //months from 1-12
  const day = dateObj.getUTCDate();
  const year = dateObj.getUTCFullYear();

  return month + "/" + day + "/" + year;
}

const plotChartData = (chartData) => {
  const dispTarget = document.getElementById('app-wrapper__chart-area-charts');
  const todaysDate = getTodaysDate();

  chartData.forEach(coinPrices => {
    Object.keys(coinPrices).forEach(coinSymbol => {
      dispTarget.innerHTML += `<div class="app-wrapper__chart-area-charts-chart">
        <span>
          <h2>${coinSymbol}</h2>
          <h3>${coinPrices[coinSymbol].value}</h3>
        </span>
        <canvas id="${coinSymbol.toLowerCase()}-chart"></canvas>
      </div>`;

      const coinPriceData = coinPrices[coinSymbol].prices.map(element => element.price);
      const labels = coinPriceData.map((element, index) => index);
    
      const data = {
        labels: labels,
        datasets: [{
          label: `5 min prices for ${todaysDate}`,
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgb(255, 99, 132)',
          data: coinPriceData,
        }]
      };
    
      const config = {
        type: 'line',
        data: data,
        options: {}
      };

      // https://stackoverflow.com/a/55012839/2710227
      setTimeout(() => {
        charts[coinSymbol] = new Chart(
          document.getElementById(`${coinSymbol.toLowerCase()}-chart`).getContext("2d"),
          config
        );
      }, 100);
    });
  });
}

const getChartData = () => {
  axios.get(`${localApiServerIpPort}/get-all-chart-data`)
    .then(function (response) {
      // handle success
      plotChartData(response.data.data);
    })
    .catch(function (error) {
      // handle error
      alert('Failed to load chart data');
      console.log(error);
    });
}

const checkErrors = () => {
  axios.get(`${localApiServerIpPort}/check-errors`)
    .then(function (response) {
      // handle success
      if (response.data.errors && Object.keys(response.data.errors).length) {
        alert(`errors occured \r\n ${JSON.stringify(response.data)}`);
      }
    })
    .catch(function (error) {
      // handle error
      alert('Failed to load chart data');
      console.log(error);
    });
}

getChartData();
checkErrors();