// global localApiServerIpPort

// this object has a reference to all instantiated Charts
const charts = {};

const plotChartData = (chartData) => {
  const dispTarget = document.getElementById('app-wrapper__chart-area-charts');

  chartData.forEach(coinPrices => {
    Object.keys(coinPrices).forEach(coinSymbol => {
      dispTarget.innerHTML += `<div class="app-wrapper__chart-area-charts-chart">
        <canvas id="${coinSymbol.toLowerCase()}-chart"></canvas>
      </div>`;

      const coinPriceData = coinPrices[coinSymbol].map(element => element.price);
      const labels = coinPriceData.map((element, index) => index);
    
      const data = {
        labels: labels,
        datasets: [{
          label: coinSymbol,
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

getChartData();