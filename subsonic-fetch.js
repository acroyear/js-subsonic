/* js-subsonic:subsonic-fetch - fetch and promises based library for accessing Subsonic servers */
/* Copyright @2016 Joseph W Shelby */
/* Released under the MIT License */

var fetch = require('node-fetch');
var Promise = require("bluebird");
fetch.Promise = Promise;
var URI = require('urijs');

var SubSonicFetch = {
  serverAPIVersion: "1.13.0",
  _u: '',
  _s: '',
  _ts: '',
  _tt: '',
  _b: '0',
  coverArtCache: {},
  _buildURI: function(method, params, traditional) {
    var uri = this._s + "/rest/" + method + ".view",
      that = this;
    uri = URI(uri);
    uri.addQuery(params || {});
    uri.addQuery({
      v: that.serverAPIVersion,
      f: 'json',
      c: 'SubFire',
      u: that._u
    });
    if (that._tt && that._ts) {
      uri.addQuery({
        s: that._ts,
        t: that._tt
      });
    } else if (that._p && versionCompare(that.serverAPIVersion, "1.13.0") >= 0) {
      var s = Math.random().toString(36).replace(/[^a-z]+/g, '');
      var t = md5(that._p + s);
      uri.addQuery({
        s: s,
        t: t
      });
    } else {
      // currently unsupported
      uri.addQuery({
        p: that._encP
      });
    }
    // console.log(params);
    // uri = uri + $.param(params, traditional);
    return uri.toString();
  },
  // I hate that i'm having to add this last
  _execute: function(method, params, traditional) {
    var that = this;
    return new Promise(function(rs, rj) {
      var uri = that._buildURI(method, params, traditional);
      fetch(uri.toString()).then(function(res) {
        console.log(res);
        if (!res.ok) {
          rj(res);
          return;
        }
        return res.json();
      }).then(function(res) {
        console.log(res);
        var reply = res['subsonic-response'];
        if (reply.status === 'failed') {
          rj(reply);
        } else {
          rs(reply);
        }
      }).catch(function(err) {
        console.log(err);
        rj(err);
      });
    });
  },

  open: function(server, username, bitrate, seed, token, ping) {
    // reset capabilities
    this.serverAPIVersion = "1.13.0";
    this._u = username;
    this._s = server;
    this._b = bitrate || '0';
    this._tt = token;
    this._ts = seed;
    return ping ? this.ping() : this;
  },

  ping: function() {
    var that = this;
    return this._execute("ping");
    // this._execute("ping", {}, function(err, res) {
    //   if (err) console.log(err);
    //   window.err = window.err || err;
    //   if (err && typeof err !== 'string') {
    //     if (err.error.code === 10 || err.error.code === 20 || err.error.code === 30) {
    //       console.warn("downgrading API version to", err.version);
    //       that.serverAPIVersion = err.version;
    //       return that.ping(cb);
    //     } else {
    //       if (cb) return cb(err);
    //     }
    //   } else if (err) {
    //     if (cb) return cb(err);
    //   }
    //   that.serverAPIVersion = res.version;
    //   if (cb) cb(null, res);
    //   // that.addChatMessage(navigator.userAgent);
    // });
  },

  getPlaylists: function() {
    return this._execute("getPlaylists");
  },
  getPlaylist: function(id) {
    return this._execute("getPlaylist", {
      id: id
    });
  },
  getMusicFolders: function() {
    return this._execute("getMusicFolders");
  },
  getIndexes: function(id) {
    var params = id === null || id === undefined ? {} : {
      musicFolderId: id
    };
    return this._execute("getIndexes", params);
  },
  getMusicDirectory: function(id) {
    return this._execute("getMusicDirectory", {
      id: id
    });
  },
  getGenres: function(id) {
    return this._execute("getGenres", {
      id: id
    });
  },
  getArtists: function(cb) {
    return this._execute("getArtists", {});
  },
  getArtist: function(id) {
    return this._execute("getArtist", {
      id: id
    });
  },
  getTopSongs: function(name, count) {
    return this._execute("getTopSongs", {
      artist: name,
      count: count || 50
    });
  },
  getAlbum: function(id) {
    return this._execute("getAlbum", {
      id: id
    });
  },
  getSong: function(id) {
    return this._execute("getSong", {
      id: id
    });
  },
  getAlbumList: function(type, params) {
    params = params || {};
    params.type = type;
    return this._execute("getAlbumList", params);
  },
  getAlbumList2: function(type, params) {
    params = params || {};
    params.type = type;
    return this._execute("getAlbumList2", params);
  },
  randomizeFolder: function(id, size) {
    var params = id === null || id === undefined ? {} : {
      musicFolderId: id
    };
    params.size = size || 50;
    return this._execute("getRandomSongs", params);
  },
  getCoverArtURL: function(id, size) {
    var params = {
      id: id
    };
    if (size) params.size = size;
    var url = this._buildURI("getCoverArt", params);
    var key = trimImageUrlEssentials(url);
    var firstUrl = this.coverArtCache[key];
    if (!firstUrl) {
      this.coverArtCache[key] = url;
    } else {
      // console.log("match", "using", firstUrl, "instead of", url);
      url = firstUrl;
    }
    return url;
  },
  getHLSURL: function(id, params) {
    params = $.extend(params || {}, {
      id: id,
      maxBitRate: this._b
    });
    return this._buildURI("hls", params);
  },
  getStreamingURL: function(id, params) {
    params = $.extend(params || {}, {
      id: id,
      maxBitRate: this._b
    });
    return this._buildURI("stream", params);
  },
  getDownloadURL: function(id) {
    return this._buildURI("download", {
      id: id
    });
  },
  getArtistInfo: function(id, useID3) {
    var method = useID3 ? "getArtistInfo2" : "getArtistInfo";
    var params = {
      id: id,
      count: 20
    };
    return this._execute(method, params);
  },
  getSimilarSongs: function(id, useID3, count) {
    var method = useID3 ? "getSimilarSongs2" : "getSimilarSongs";
    var params = {
      id: id,
      count: count
    };
    return this._execute(method, params);
  },
  search: function(search, useID3, params) {
    var method = useID3 ? "search3" : "search2";
    params.query = search;
    return this._execute(method, params);
  },
  savePlayQueue: function(ids, current) {
    var method = "savePlayQueue";
    var params = {
      id: ids,
      current: current
    };
    return this._execute(method, params, true);
  },
  getPlayQueue: function(cb) {
    return this._execute("getPlayQueue", null);
  },
  getChatMessages: function(since) {
    if (typeof since === 'function') {
      cb = since;
      since = null;
    }
    return this._execute("getChatMessages", since ? {
      since: since
    } : null);
  },
  addChatMessage: function(message) {
    return this._execute("addChatMessage", {
      message: message
    });
  },
  createBookmark: function(id, position, comment) {
    var params = {
      id: id,
      position: position
    };
    if (comment) params.comment = comment;
    return this._execute("createBookmark", params);
  },
  deleteBookmark: function(id) {
    var params = {
      id: id
    };
    return this._execute("deleteBookmark", params);
  },
  getBookmarks: function(cb) {
    return this._execute("getBookmarks", null);
  }
};
console.log(SubSonicFetch);
module.exports = SubSonicFetch;
