// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-brown; icon-glyph: magic;
// Caltrain Southbound Departures – Palo Alto (Scriptable Widget)
// Uses 511.org SIRI StopMonitoring
// Updated + API key inserted

const API_KEY = "80c94ed4-fc5c-4035-bb87-737050d740b2";
const STOP_ID = "70221";   // Sunnyvale North
const NUM_RESULTS = 4;

// -------------------------------
// Fetch departures from 511
// -------------------------------
async function getDepartures() {
  const url =
    `https://api.511.org/transit/StopMonitoring` +
    `?api_key=${API_KEY}` +
    `&agency=CT` +
    `&stopCode=${STOP_ID}` +
    `&format=json`;

  const req = new Request(url);
  const json = await req.loadJSON();
  
  // console.log(JSON.stringify(json, null, 2));


  try {
    const visits =
      json?.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit;

    if (!visits || visits.length === 0) return [];

    return visits
      .map(v => v.MonitoredVehicleJourney)
      .map(j => ({
        destination: j.DestinationName,
        aimed: j.MonitoredCall?.AimedDepartureTime,
        expected: j.MonitoredCall?.ExpectedDepartureTime || j.MonitoredCall?.AimedDepartureTime
      }))
      // southbound filter (Dest: San Jose / Tamien / Gilroy)
      .filter(j =>
        j.destination &&
        /(Francisco)/i.test(j.destination)
      )
      .map(j => {
        const t = new Date(j.expected);
        return {
          destination: j.destination,
          departureTime: t,
          timeStr: t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        };
      })
      .sort((a, b) => a.departureTime - b.departureTime)
      .slice(0, NUM_RESULTS);

  } catch (err) {
    console.error("Parsing error:", err);
    return [];
  }
}

// -------------------------------
// Build widget UI
// -------------------------------
async function createWidget() {
  const updateTime = new Date();
  const departures = await getDepartures();

  // Dim before noon (morning = southbound time, not northbound)
  const currentHour = new Date().getHours();
  const isDimmed = currentHour < 12;
  const opacity = isDimmed ? 0.3 : 1.0;

  const w = new ListWidget();
  w.backgroundColor = new Color("#1E1E1E");
  w.setPadding(14, 14, 14, 14);

  const title = w.addText("Sunnyvale → North");
  title.font = Font.boldSystemFont(16);
  title.textColor = Color.white();
  title.textOpacity = opacity;

  w.addSpacer(8);

  if (departures.length === 0) {
    const msg = w.addText("No live trains");
    msg.textColor = Color.red();
    msg.font = Font.mediumSystemFont(12);
    msg.textOpacity = opacity;
  } else {
    for (const d of departures) {
      const rowStack = w.addStack();
      rowStack.layoutHorizontally();
      rowStack.centerAlignContent();
      rowStack.spacing = 0;

      // Check if train has already departed (negative time)
      const isPast = d.departureTime < new Date();
      const rowColor = isPast ? new Color("#FF8888") : Color.white();

      const depDate = rowStack.addDate(d.departureTime);
      depDate.applyTimerStyle();
      depDate.font = Font.mediumSystemFont(13);
      depDate.textColor = rowColor;
      depDate.textOpacity = opacity;

      const separator = rowStack.addText("  •  ");
      separator.font = Font.mediumSystemFont(13);
      separator.textColor = rowColor;
      separator.textOpacity = opacity;

      const timeText = rowStack.addText(d.timeStr);
      timeText.font = Font.mediumSystemFont(13);
      timeText.textColor = rowColor;
      timeText.textOpacity = opacity;
    }
  }

  // Add "last updated" timestamp at bottom (auto-updating timer)
  w.addSpacer(8);
  const updateStack = w.addStack();
  updateStack.layoutHorizontally();
  updateStack.centerAlignContent();
  updateStack.spacing = 0;

  const updateLabel = updateStack.addText("Updated ");
  updateLabel.font = Font.systemFont(10);
  updateLabel.textColor = new Color("#888888");
  updateLabel.textOpacity = 0.7;

  const updateDate = updateStack.addDate(updateTime);
  updateDate.applyTimerStyle();
  updateDate.font = Font.systemFont(10);
  updateDate.textColor = new Color("#888888");
  updateDate.textOpacity = 0.7;

  const agoLabel = updateStack.addText(" ago");
  agoLabel.font = Font.systemFont(10);
  agoLabel.textColor = new Color("#888888");
  agoLabel.textOpacity = 0.7;

  // Refresh every minute
  const refreshDate = new Date(Date.now() + 60000);
  w.refreshAfterDate = refreshDate;

  return w;
}

// -------------------------------
// Run
// -------------------------------
const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

Script.complete();
