# LightsOut

LightsOut is a hackathon MVP for the USAII 2026 climate action challenge. It helps schools turn club and meeting schedules into a clear visual room-energy plan.

Workable demo link: https://fionn-gaioni.github.io/USAII-2026/

OR

Open `index.html` in a browser to run the app. No install, server, account, or internet connection is required. The app stores edits in local browser storage by plan date.

## Local AI training data

LightsOut trains a small browser-based regression model in `app.js`. The model starts with synthetic Ardrey Kell room-use scenarios generated from the app's room list, event durations, occupancy levels, lighting/HVAC/projector needs, after-hours use, and weather-like temperature examples.

The model also accepts real measured energy rows from the `More info` > `Further training` panel. Imported rows are saved only in the user's browser with `localStorage` and are weighted more heavily than synthetic rows when the model retrains.

CSV format:

```csv
roomId,start,end,students,lights,hvac,projector,outdoorTemp,actualKwh
a101,15:30,16:30,24,true,true,false,82,4.6
auditorium,17:00,19:00,180,true,true,true,76,31.5
```

Model features include room area, capacity, event duration, occupancy ratio, floor, lights, HVAC, projector, after-hours use, large-space flag, outdoor temperature, heating demand, and cooling demand. Weather-aware HVAC timing uses the free Open-Meteo API. CO2 savings use an assumption of `0.385 kg CO2/kWh`.

