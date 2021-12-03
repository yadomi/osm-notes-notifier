const { resolve } = require('path')
const fs = require('fs')

const axios = require("axios").default;
const { XMLParser } = require("fast-xml-parser");
const parser = new XMLParser();
const ms = require('ms');
const yaml = require('js-yaml')
const { differenceWith, values, keys, compose, flatten, reduce, toPairs } = require("ramda");
const MQTT = require("async-mqtt");

const args = process.argv.slice(2);
const configPath = args[0] ? resolve(args[0]) : "./config.yml"; 
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

const instance = axios.create({
  baseURL: "https://www.openstreetmap.org/api/0.6/notes",
});

const initialState = keys(config.bbox).reduce((sum, bbox) => {
  sum[bbox] = {}
  return sum;
}, {});

const Type = {
  NEW: "new", 
  COMMENT: "comment", 
  CLOSED: "closed", 
  REACTIVATED: "reactivated", 
}

async function get (bbox) {
    const response = await instance.get("/feed?bbox=" + bbox);

    const { rss: { channel: { item } } } = parser.parse(response.data);
    const feed = item.reduce((sum, note) => {
        if (note.title.startsWith("new note")) {
          note.type = Type.NEW;
        } else if (note.title.startsWith("new comment")) {
          note.type = Type.COMMENT;
        } else if (note.title.startsWith("closed note")) {
          note.type = Type.CLOSED;
        } else if (note.title.startsWith("reactivated note")) {
          note.type = Type.REACTIVATED;
        }

        note.link = note.link.split("#")[0];
        note.pubDate = new Date(note.pubDate);

        if (sum[note.link]) {
            sum[note.link].push(note)
        } else {
            sum[note.link] = [note]
        }

        return sum;
    }, {})

    return feed;
}

function compare (notes, initialState) {
  return compose(
    flatten,
    values,
    reduce((sum, [id, value]) => {
      sum[id] = differenceWith((a, b) => a.type === b.type, value, initialState[id] || []);
      return sum;
    }, []),
    toPairs
  )(notes);
}

async function update (bbox, onUpdate) {
    const types = config.bbox[bbox] || Object.values(Type);
    console.log('OSM: Fetching ' + bbox, types);

    const notes = await get(bbox);
    const diff = compare(notes, initialState[bbox]);
    initialState[bbox] = notes;

    if (diff.length) {
      const updates = diff.filter(note => types.includes(note.type))
      console.log(`MQTT: Publishing ${diff.length} notes`)
      for (const update of updates) {
        await onUpdate(update)
      }
    }
}

async function setup () {
  const { mqtt: { broker, topic = 'osm/note', ...mqttOptions } } = config
  const mqtt = await MQTT.connectAsync(broker, mqttOptions);

  mqtt.on("connect", () => console.log('MQTT: Connected'));

  const onUpdate = update => {
    return mqtt.publish(topic, JSON.stringify(update));
  }

  for (const bbox in config.bbox) {
    initialState[bbox] = await get(bbox)
    update(bbox, onUpdate);

    setInterval(() => update(bbox, onUpdate), ms(config.interval || "15m"));
  };
}

setup()
