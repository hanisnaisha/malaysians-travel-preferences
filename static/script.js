document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('year-select');
    const companionSelect = document.getElementById('companion-select');
    const destinationCountrySelect = document.getElementById('destination-country-select');
    
    const mapChart = echarts.init(document.getElementById('popular-destinations-chart'));
    const destinationChart = echarts.init(document.getElementById('destination-trends-chart'));
    const radarChart = echarts.init(document.getElementById('radar-chart'));

    let longFormatData = [];

    const DATA_PATH = 'travelling-companion-cleaned.csv';

    function loadData() {
        try {
            Papa.parse(DATA_PATH, {
                download: true,
                header: true,
                dynamicTyping: true,
                transformHeader: header => header.trim(),
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        console.error("Errors while parsing CSV:", results.errors);
                        return;
                    }
                    
                    longFormatData = results.data.map(d => {
                        let companion = d['Travelling Companion'];
                        if (companion === 'WITH BUSINESS ACCOCIATE') {
                            companion = 'WITH BUSINESS ASSOCIATE';
                        }
                        return {
                            year: d.Year,
                            companion: companion,
                            country: d.Country,
                            continent: d.Continent,
                            value: d.Percentage
                        };
                    });

                    console.log("Successfully parsed and transformed data.");
                    populateCompanionFilter();
                    populateCountryFilter();
                    updateVisualization();
                },
                error: (error) => console.error("Could not fetch or parse CSV:", error)
            });
        } catch (error) {
            console.error("Fatal error during data loading:", error);
        }
    }

    function populateCompanionFilter() {
        const companions = [...new Set(longFormatData.map(d => d.companion))].sort();
        companionSelect.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = 'All';
        allOption.textContent = 'All';
        companionSelect.appendChild(allOption);
        companions.forEach(companion => {
            const option = document.createElement('option');
            option.value = companion;
            option.textContent = companion;
            companionSelect.appendChild(option);
        });
    }

    function populateCountryFilter() {
        const countries = [...new Set(longFormatData.map(d => d.country))].sort();
        destinationCountrySelect.innerHTML = '<option value="">All Countries</option>';
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            destinationCountrySelect.appendChild(option);
        });
    }

    function updateVisualization() {
        if (!longFormatData.length) return;
        renderMap();
        renderCompanionChart();
        renderDestinationChart();
        renderRadarChart();
        renderContinentBarCharts();
        renderPredictionsTable();
    }

    function renderMap() {
        const selectedYear = yearSelect.value;
        const selectedCompanion = companionSelect.value;
        let filteredData = longFormatData;

        if (selectedYear !== 'both') {
            filteredData = filteredData.filter(d => d.year === parseInt(selectedYear));
        }
        if (selectedCompanion !== 'All') {
            filteredData = filteredData.filter(d => d.companion === selectedCompanion);
        }
        
        const destinationCounts = filteredData.reduce((acc, d) => {
            if (d.country && d.value != null) {
                acc[d.country] = (acc[d.country] || 0) + d.value;
                }
            return acc;
        }, {});

        const seriesData = Object.keys(destinationCounts).map(country => ({
            name: country.trim(),
            value: parseFloat(destinationCounts[country].toFixed(2))
        }));
        
        const nameMap = { 'USA': 'United States of America', 'United Kingdom': 'United Kingdom', 'South Korea': 'South Korea', 'Russia': 'Russia' };
        const values = seriesData.map(item => item.value);
        const min = values.length > 0 ? Math.min(...values) : 0;
        const max = values.length > 0 ? Math.max(...values) : 100;
        
        mapChart.setOption({
             tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
             visualMap: {
                 type: 'continuous',
                 orient: 'vertical',
                 left: 'right',
                 top: 'center',
                 min: min,
                 max: max,
                 inRange: { color: ['#e0f3f8', '#74a9cf', '#0570b0', '#023858', '#002f4b'] },
                 calculable: true,
                 textStyle: { color: '#fff' }
             },
             series: [{
                 name: 'Malaysian Travellers',
                 type: 'map',
                 map: 'world',
                 roam: true,
                 itemStyle: { areaColor: '#22264b', borderColor: '#4d4d7a', borderWidth: 1 },
                 emphasis: { label: { show: true }, itemStyle: { areaColor: '#ffc107' } },
                 nameMap: nameMap,
                 data: seriesData.map(item => ({...item, name: nameMap[item.name] || item.name }))
             }]
        });
    }

    function renderCompanionChart() {
        // Donut chart
        const donutContainer = document.getElementById('companion-donut-chart');
        const legendContainer = document.getElementById('companion-legend');
        legendContainer.innerHTML = '';
        let donutChart = echarts.getInstanceByDom(donutContainer);
        if (!donutChart) donutChart = echarts.init(donutContainer);

        const selectedYear = yearSelect.value;
        let filteredData = longFormatData;
        if (selectedYear !== 'both') {
            filteredData = filteredData.filter(d => d.year === parseInt(selectedYear));
        }

        const companionCounts = {};
        filteredData.forEach(d => {
            const companion = d.companion;
            companionCounts[companion] = (companionCounts[companion] || 0) + d.value;
        });

        const chartData = Object.keys(companionCounts)
            .map(key => ({
                name: key,
                value: parseFloat(companionCounts[key].toFixed(2))
            }))
            .sort((a, b) => b.value - a.value);

        const colorPalette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

        // Donut chart
        donutChart.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
            series: [{
                name: 'Companion Type',
                type: 'pie',
                radius: ['50%', '75%'],
                avoidLabelOverlap: false,
                label: { show: false },
                emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
                labelLine: { show: false },
                data: chartData.map((item, i) => ({ ...item, itemStyle: { color: colorPalette[i % colorPalette.length] } }))
            }]
        });

        // Custom legend
        const legendList = document.createElement('ul');
        legendList.className = 'custom-legend';
        chartData.forEach((item, index) => {
            const listItem = document.createElement('li');
            const colorSwatch = document.createElement('span');
            colorSwatch.className = 'legend-color-swatch';
            colorSwatch.style.backgroundColor = colorPalette[index % colorPalette.length];
            const labelText = document.createElement('span');
            labelText.className = 'legend-label-text';
            labelText.textContent = item.name;
            listItem.appendChild(colorSwatch);
            listItem.appendChild(labelText);
            legendList.appendChild(listItem);
        });
        legendContainer.appendChild(legendList);
    }

    function renderDestinationChart() {
        const selectedCompanion = companionSelect.value;
        const selectedCountry = destinationCountrySelect.value;

        let filteredData = longFormatData;
        if (selectedCompanion !== 'All') {
            filteredData = filteredData.filter(d => d.companion === selectedCompanion);
        }
        
        let seriesData = [];
        let legendData = [];

        if (selectedCountry) {
            // Only one country selected
            const countryData = filteredData.filter(d => d.country === selectedCountry);
            const totals = { '2016': 0, '2017': 0 };
            countryData.forEach(d => {
                if (d.year === 2016) totals['2016'] += (d.value || 0);
                if (d.year === 2017) totals['2017'] += (d.value || 0);
            });
            legendData = [selectedCountry];
            seriesData = [{
                name: selectedCountry,
                type: 'line',
                data: [totals['2016'], totals['2017']]
            }];
        } else {
            // All countries: show top 5 by total (2016+2017)
            const countryTotals = {};
             filteredData.forEach(d => {
                if (!countryTotals[d.country]) countryTotals[d.country] = { '2016': 0, '2017': 0, total: 0 };
                if (d.year === 2016) countryTotals[d.country]['2016'] += (d.value || 0);
                if (d.year === 2017) countryTotals[d.country]['2017'] += (d.value || 0);
                countryTotals[d.country].total += (d.value || 0);
            });
            const topCountries = Object.keys(countryTotals)
                .sort((a, b) => countryTotals[b].total - countryTotals[a].total)
                .slice(0, 5);
            legendData = topCountries;
            seriesData = topCountries.map(country => ({
                name: country,
                type: 'line',
                data: [countryTotals[country]['2016'], countryTotals[country]['2017']]
            }));
        }
        
        destinationChart.setOption({
            tooltip: {
                trigger: 'axis',
                valueFormatter: value => (typeof value === 'number' ? value.toFixed(2) : value) + '%'
            },
            legend: { data: legendData, textStyle: { color: '#fff' } },
            xAxis: { type: 'category', boundaryGap: false, data: ['2016', '2017'], axisLine: { lineStyle: { color: '#fff' } } },
            yAxis: { type: 'value', axisLabel: { formatter: '{value}%' }, axisLine: { lineStyle: { color: '#fff' } } },
            series: seriesData
        }, true);
    }

    function renderRadarChart() {
        if (!longFormatData.length) return;
        const selectedYear = yearSelect.value;
        const selectedCompanion = companionSelect.value;

        let filteredData = longFormatData;
        if (selectedYear !== 'both') {
            filteredData = filteredData.filter(d => d.year === parseInt(selectedYear));
        }
        if (selectedCompanion !== 'All') {
            filteredData = filteredData.filter(d => d.companion === selectedCompanion);
        }

        const continentTotals = {};
        filteredData.forEach(d => {
            continentTotals[d.continent] = (continentTotals[d.continent] || 0) + d.value;
        });
        
        const sortedContinents = Object.keys(continentTotals).sort((a, b) => continentTotals[b] - continentTotals[a]);
        const maxVal = Math.max(...Object.values(continentTotals));
        const indicator = sortedContinents.map(name => ({ name, max: maxVal * 1.1 }));
        const data = [sortedContinents.map(name => continentTotals[name])];

        radarChart.setOption({
            tooltip: { trigger: 'item' },
            radar: {
                indicator,
                splitArea: { areaStyle: { color: ['rgba(0,198,255,0.15)','rgba(0,198,255,0.05)'] } },
                axisLine: { lineStyle: { color: '#00c6ff' } },
                splitLine: { lineStyle: { color: '#00c6ff', opacity: 0.5 } },
                name: { textStyle: { color: '#fff', fontWeight: 'bold', fontSize: 14 } }
            },
            series: [{
                name: 'Preferred Continents',
                type: 'radar',
                data: [{ value: data[0], name: `${selectedYear === 'both' ? 'All Years' : selectedYear} / ${selectedCompanion}` }],
                areaStyle: { opacity: 0.4 },
                lineStyle: { width: 3, color: '#00c6ff' },
                itemStyle: { color: '#00c6ff' }
            }]
        });
    }

    function renderContinentBarCharts() {
        const continents = [
            { name: 'Asia', id: 'bar-chart-asia' },
            { name: 'Europe', id: 'bar-chart-europe' },
            { name: 'Oceania', id: 'bar-chart-oceania' },
            { name: 'North America', id: 'bar-chart-north-america' }
        ];
        const selectedYear = yearSelect.value;
        const selectedCompanion = companionSelect.value;
        let filteredData = longFormatData;
        if (selectedYear !== 'both') {
            filteredData = filteredData.filter(d => d.year === parseInt(selectedYear));
        }
        if (selectedCompanion !== 'All') {
            filteredData = filteredData.filter(d => d.companion === selectedCompanion);
        }
        continents.forEach(continent => {
            const container = document.getElementById(continent.id);
            if (!container) return;
            let chart = echarts.getInstanceByDom(container);
            if (!chart) chart = echarts.init(container);
            // Aggregate totals for each country in this continent
            const countryTotals = {};
            filteredData.forEach(d => {
                if (
                    d.continent &&
                    d.country &&
                    d.continent.trim().toLowerCase() === continent.name.trim().toLowerCase()
                ) {
                    countryTotals[d.country] = (countryTotals[d.country] || 0) + (d.value || 0);
                }
            });
            // Only keep countries with total > 0
            const nonZeroCountries = Object.keys(countryTotals).filter(c => countryTotals[c] > 0);
            if (nonZeroCountries.length === 0) {
                chart.clear();
                chart.setOption({
                    title: { text: continent.name, left: 'center', textStyle: { color: '#fff', fontSize: 16 } },
                    xAxis: { show: false },
                    yAxis: { show: false },
                    series: []
                });
                return;
            }
            // Find most and least preferred among non-zero
            const sorted = nonZeroCountries.sort((a, b) => countryTotals[b] - countryTotals[a]);
            const most = sorted[0];
            const least = sorted.length > 1 ? sorted[sorted.length - 1] : null;
            let xData, yData;
            if (least) {
                xData = [most, least];
                yData = [countryTotals[most], countryTotals[least]];
            } else {
                // Only one country, show it twice
                xData = [most, most];
                yData = [countryTotals[most], countryTotals[most]];
            }
            chart.setOption({
                title: { text: continent.name, left: 'center', textStyle: { color: '#fff', fontSize: 16 } },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v.toFixed(2) + '%' },
                grid: { left: 40, right: 40, top: 50, bottom: 40 },
                xAxis: {
                    type: 'category',
                    data: xData.map(String),
                    axisLabel: { color: '#fff', show: true },
                    minInterval: 1,
                    axisTick: { show: false },
                    axisLine: { show: true }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: { color: '#fff', formatter: '{value}%' },
                    splitLine: { show: true, lineStyle: { color: '#ccc', type: 'dashed' } },
                    axisLine: { show: true },
                    min: 0,
                    max: 'dataMax'
                },
                series: [{
                    type: 'bar',
                    data: yData,
                    barWidth: 40,
                    itemStyle: {
                        color: function(params) {
                            return params.dataIndex === 0 ? '#00c6ff' : '#ee6666';
                        }
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: '{c}%',
                        color: '#fff',
                        fontWeight: 'bold'
                    }
                }]
            });
        });
    }

    function renderPredictionsTable() {
        fetch('dashboard_predictions.json')
            .then(response => response.json())
            .then(data => {
                // Limit to first 20 rows for display
                const rows = data.slice(0, 20);
                if (rows.length === 0) {
                    document.getElementById('predictions-table-container').innerHTML = '<p>No predictions available.</p>';
                    return;
                }
                // Build table
                let html = '<table style="width:100%;border-collapse:collapse;">';
                html += '<thead><tr>';
                const headerMap = {
                    'Companion': 'Companion',
                    'Year': 'Year',
                    'Continent': 'Continent',
                    'Actual': 'Actual Destination',
                    'Predicted': 'Predicted Destination'
                };
                Object.keys(rows[0]).forEach(key => {
                    html += `<th style="border:1px solid #ccc;padding:4px 8px;background:#22223b;color:#fff;">${headerMap[key] || key}</th>`;
                });
                html += '</tr></thead><tbody>';
                rows.forEach(row => {
                    const correct = row.Actual === row.Predicted;
                    html += `<tr style="background:${correct ? '#d4f8e8' : '#ffe0e6'}; color:#222;">`;
                    Object.values(row).forEach(val => {
                        html += `<td style="border:1px solid #ccc;padding:4px 8px;">${val}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
                document.getElementById('predictions-table-container').innerHTML = html;
            })
            .catch(err => {
                document.getElementById('predictions-table-container').innerHTML = '<p>Error loading predictions.</p>';
                console.error(err);
            });
    }

    function renderHistoricalPredictionsTable() {
        fetch('dashboard_predictions_2016_2017.json')
            .then(response => response.json())
            .then(data => {
                const rows = data.slice(0, 30); // Show first 30 for brevity
                if (rows.length === 0) {
                    document.getElementById('historical-predictions-table-container').innerHTML = '<p>No predictions available.</p>';
                    return;
                }
                let html = '<table style="width:100%;border-collapse:collapse;">';
                html += '<thead><tr>';
                Object.keys(rows[0]).forEach(key => {
                    html += `<th style="border:1px solid #ccc;padding:4px 8px;background:#22223b;color:#fff;">${key}</th>`;
                });
                html += '</tr></thead><tbody>';
                rows.forEach(row => {
                    const correct = row.Actual === row.Predicted;
                    html += `<tr style="background:${correct ? '#d4f8e8' : '#ffe0e6'}; color:#222;">`;
                    Object.values(row).forEach(val => {
                        html += `<td style="border:1px solid #ccc;padding:4px 8px;">${val}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
                document.getElementById('historical-predictions-table-container').innerHTML = html;
            })
            .catch(err => {
                document.getElementById('historical-predictions-table-container').innerHTML = '<p>Error loading predictions.</p>';
                console.error(err);
            });
    }

    function renderFuturePredictionsTable() {
        fetch('dashboard_predictions_2026_2027.json')
            .then(response => response.json())
            .then(data => {
                const rows = data.slice(0, 30); // Show first 30 for brevity
                if (rows.length === 0) {
                    document.getElementById('future-predictions-table-container').innerHTML = '<p>No predictions available.</p>';
                    return;
                }
                let html = '<table style="width:100%;border-collapse:collapse;">';
                html += '<thead><tr>';
                Object.keys(rows[0]).forEach(key => {
                    html += `<th style="border:1px solid #ccc;padding:4px 8px;background:#22223b;color:#fff;">${key}</th>`;
                });
                html += '</tr></thead><tbody>';
                rows.forEach(row => {
                    html += `<tr style="background:#f8f9fa; color:#222;">`;
                    Object.values(row).forEach(val => {
                        html += `<td style="border:1px solid #ccc;padding:4px 8px;">${val}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
                document.getElementById('future-predictions-table-container').innerHTML = html;
            })
            .catch(err => {
                document.getElementById('future-predictions-table-container').innerHTML = '<p>Error loading predictions.</p>';
                console.error(err);
            });
    }

    yearSelect.addEventListener('change', updateVisualization);
    companionSelect.addEventListener('change', updateVisualization);
    destinationCountrySelect.addEventListener('change', renderDestinationChart);

    loadData();
    renderPredictionsTable();
    renderHistoricalPredictionsTable();
    renderFuturePredictionsTable();
}); 