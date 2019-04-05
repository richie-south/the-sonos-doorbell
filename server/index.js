const { send } = require('micro')
const { router, get } = require('microrouter')
const { DeviceDiscovery, Sonos, SpotifyRegion } = require('sonos')

let isPlaying = false
const TRACKS = [
  {
    uri: 'spotify:track:13p4BxB2BPIzG3hI8UE6ti',
    startTimeSEC: 40,
    playTimeMILLISECONDS: 10000
  },
  {
    uri: 'spotify:track:0Bo5fjMtTfCD8vHGebivqc',
    startTimeSEC: 34,
    playTimeMILLISECONDS: 8000
  },
  {
    uri: 'spotify:track:749W3kDaSYtSn12pCF6gd6',
    startTimeSEC: 0,
    playTimeMILLISECONDS: 8000
  },
  {
    uri: 'spotify:track:749W3kDaSYtSn12pCF6gd6',
    startTimeSEC: 0,
    playTimeMILLISECONDS: 8000
  },
  {
    uri: 'spotify:track:6AwCMQu47EyMU2IbzhkjlL',
    startTimeSEC: 50,
    playTimeMILLISECONDS: 7000
  },
  {
    uri: 'spotify:track:7KgqURVRaVhqgyKno2mc1D',
    startTimeSEC: 40,
    playTimeMILLISECONDS: 9000
  },
  {
    uri: 'spotify:track:6PlHaDiKonFXoKz1Lbdn53',
    startTimeSEC: 36,
    playTimeMILLISECONDS: 9000
  },
  {
    uri: 'spotify:track:0FQI41v9n4dUi8EUEto8uv',
    startTimeSEC: 30,
    playTimeMILLISECONDS: 7000
  },
  {
    uri: 'spotify:track:4bcnUDksPr6hCr04DwtlY7',
    startTimeSEC: 114,
    playTimeMILLISECONDS: 8000
  },
  {
    uri: 'spotify:track:5al6GUztuaUrPMY1enidH0',
    startTimeSEC: 41,
    playTimeMILLISECONDS: 8000
  },
  {
    uri: 'spotify:track:7y9EzGiolxVGVDizc9Q2LX',
    startTimeSEC: 3,
    playTimeMILLISECONDS: 9000
  },
  {
    uri: 'spotify:track:4nGsdQDYpWzqWLyWIWnimp',
    startTimeSEC: 42,
    playTimeMILLISECONDS: 9000
  },
  {
    uri: 'spotify:track:5VnpYqIzm02X9gOhVElQo3',
    startTimeSEC: 2,
    playTimeMILLISECONDS: 7000
  },
  {
    uri: 'spotify:track:6LUsHvIcc1olE1mbMlvTXl',
    startTimeSEC: 21,
    playTimeMILLISECONDS: 9000
  },
  {
    uri: 'spotify:track:4JiEyzf0Md7KEFFGWDDdCr',
    startTimeSEC: 147,
    playTimeMILLISECONDS: 10000
  },
  {
    uri: 'spotify:track:6eGv2JYrI7Yu8BwXWLBphJ',
    startTimeSEC: 20,
    playTimeMILLISECONDS: 10000
  },
  {
    uri: 'spotify:track:3uYm4MtU6jUQft2DtGqEoZ',
    startTimeSEC: 28,
    playTimeMILLISECONDS: 7000
  },
  {
    uri: 'spotify:track:6FZeriWMXd5ciTN7GvC0od',
    startTimeSEC: 0,
    playTimeMILLISECONDS: 10000
  }
]

const devices = []

DeviceDiscovery((device) => {
  devices.push(device)
})

const getRandomTrack = () =>
  TRACKS[Math.floor(Math.random() * TRACKS.length)]

const cleenSonosUri = (uri) =>
  uri.substring(16, uri.length).split('?')[0].split('%3a').join(':')

const pauseCurrentPlaySoundResumePrevious = async (sonos, device, track) => {
  const currentTrack = await device.currentTrack()

  await sonos.play(track.uri)
  await sonos.seek(track.startTimeSEC)

  setTimeout(async () => {
    await sonos.play(cleenSonosUri(currentTrack.uri))
    await sonos.seek(currentTrack.position)
    isPlaying = false
  }, track.playTimeMILLISECONDS + 1000)
}

const playSound = async (sonos, track) => {
  await sonos.play(track.uri)
  await sonos.seek(track.startTimeSEC)

  setTimeout(async () => {
    await sonos.pause()
    isPlaying = false
  }, track.playTimeMILLISECONDS + 1000)
}

const failReset = () => {
  if (isPlaying) {
    return
  }
  setTimeout(() => {
    isPlaying = false
  }, 30000)
}

const onDoorBell = async (req, res) => {
  const track = getRandomTrack()
  failReset()

  if (isPlaying) {
    return send(res, 200, {
      data: {
        isPlaying
      }
    })
  }
  isPlaying = true
  try {
    await Promise.all(devices.map(async (device) => {
      const sonos = new Sonos(device.host)
      const state = await sonos.getCurrentState()
      sonos.setSpotifyRegion(SpotifyRegion.EU)

      if (state === 'playing') {
        await pauseCurrentPlaySoundResumePrevious(sonos, device, track)
      } else {
        await playSound(sonos, track)
      }
    }))
  } catch (error) {
    console.error(error)
    isPlaying = false
  }

  return send(res, 200, {
    data: {
      isPlaying,
      ...track
    }
  })
}

const notfound = (req, res) => send(res, 404, 'Not found route')

module.exports = router(
  get('/ondoorbell', onDoorBell),
  get('/*', notfound)
)
