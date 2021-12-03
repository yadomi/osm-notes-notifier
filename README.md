# osm-notes-notifier

This software aim to notify when there is a new OSM notes in the defined bounding box. Also get notified when a note is closed, commented or reactivated.

It periodically parse the RSS feed of specified bbox, then send an MQTT message when there is a new note, comment ect... This mean you'll need an MQTT broker and something to react to incoming message.

## Usage:

```
node index.js ./config.yml
```

Or with docker (with a `config.yml` in the current directoy)

```
docker run yadomi/osm-notes-notifier -it --rm --name osmnotes -v $PWD:/data
```

## Configuration file

The configuration file is a YAML file.

### `bbox`

The `bbox` is an object with bbox coordinate. Eeach bbox coordindate can be configurated to notify only on specific update (all, by default)

```yaml
bbox:
  2.238794,48.805549,2.46976,48.910471: # Bounding box for Paris, will get all notification (new, closed, comment, reactivated)
  4.837665,52.343721,4.951513,52.402108: # Bounding box for Amsterdam, will only get new notes
    - new
```

### `mqtt`

This specify your MQTT broker configuration. Any valid options from MQTT.js can be added here (see: https://github.com/mqttjs/MQTT.js#mqttclientstreambuilder-options)

#### `broker`

The address of you broker, with port and protocol.

#### `topic`

The topic where the notes notification is send, by default `osm/notes`.

Example: 

```yaml
mqtt:
  broker: tcp://192.168.0.10:1883
  topic: custom/topic/osm
  username: admin
  password: VerySecure
```