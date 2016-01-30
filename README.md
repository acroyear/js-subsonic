# js-subsonic
Javascript libraries for accessing the Subsonic Media Server

## jqsubsonic
This library is for jquery users, still based on jquery and callbacks(err,res). Generally it will filter out the subsonic-response wrapper layer and each method will just return the core data asked for. The reply is always json.

### example, requiring an open/ping first, and a little callback hell
```javascript
JQSubSonic.open(c.server, c.username, c.password, c.bitrate, function(err, res) {
  if (err) {
    console.warn("err", err, err.error, typeof err.error);
    return;
  }
  // once opened, the instance can be used anywhere
  JQSubSonic.getPlaylists(function(err2, res2) {
    if (err2) {
      console.error("err2", err2);
      return;
      }
    }
    // res2 => rawResponse.subsonic-response.playlists.playlist an array of playlists, pre-filtered
    console.log(res2);
  });
});
```
## subsonic-fetch
This library uses the new fetch API and promises. Currently it is coded for node 0.10 usage, with bluebird and a module.exports.
This version supports only 5.3 and above, with no fallback for sending the password (exposed or encoded). Since it uses the token system,
it may not be compatible with LDAP-configured servers. On success, the ``then`` function of the promise invokation will receive the whole JSON of the reply.
It will check the status first, and reject (invoking ``catch`` function) if the status is "failed". The reply is always json.

### example with 'ping' test first
```javascript
// null is the bitrate, defaulting to 0 which is 'unlimited'; 
// true at the end means send a ping to the server to test getting a status
var sf = require('./subsonic-fetch');
sf.open('http://jwshome.aboutjws.info:4040', "subfire", null, "seed", "token", true).then(function(res) {
   console.log("open", res);
   return sf.getPlaylists();
 }).then(function(res) {
  console.log("getPlaylists", res);
}).catch(function(err) {
  console.warn(err);
});
```
### example without ping test
```javascript
sf.open('http://jwshome.aboutjws.info:4040', "subfire", null, "seed", "token");
sf.getPlaylists().then(function(res) {
  console.log("getPlaylists", res);
}).catch(function(err) {
  console.warn(err);
});
```
## In Production
JQSubSonic is currently the engine at the heart of [SubFire](http://subfireplayer.net/), and is considered stable. Subsonic-fetch is being developed for use in a node server to provide enhancements for a future SubFire release, and some of the methods have not been tested yet.
## License
Released under the MIT License
