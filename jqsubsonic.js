/*global console md5 */
(function($) {

  var JQSubSonic = {
    serverAPIVersion: "1.13.0",
    _u: '',
    _p: '',
    _encP: '',
    _s: '',
    _b: '0',
    coverArtCache: {},
    _buildURI: function(method, params, traditional) {
      var uri = this._s + "/rest/" + method + ".view?", that = this;
      params = $.extend(params || {}, {
        v: that.serverAPIVersion,
        f: 'json',
        c: 'SubFire',
        u: that._u
      });
      if (versionCompare(that.serverAPIVersion, "1.13.0") >= 0) {
        params.s = Math.random().toString(36).replace(/[^a-z]+/g, '');
        params.t = md5(that._p + params.s);
      } else {
        params.p = that._encP;
      }
      // console.log(params);
      uri = uri + $.param(params, traditional);
      return uri;
    },
    // I hate that i'm having to add this last
    _execute: function(method, params, callback, traditional) {
      var cb = callback;
      var uri = this._buildURI(method, params, traditional);
      $.ajax(uri, {
        fail: function(args) {
          console.error('fail', args);
          if (cb) cb(args);
        },
        error: function(ajax, args, errorThrown) {
          console.error('error', args, errorThrown || "??");
          if (cb) cb(args);
        },
        success: function(arg) {
          // console.log('success?', arg);
          if (arg['subsonic-response'].status === 'failed') {
            if (cb) cb(arg['subsonic-response']);
            return;
          }
          if (cb) cb(null, arg['subsonic-response']);
        },
        dataType: 'json',
        headers: {},
        crossDomain: true,
        xhrFields: {
          withCredentials: false
        }
      });
    },

    open: function(server, username, password, bitrate, cb) {
      // reset capabilities
      this.serverAPIVersion = "1.13.0";
      this._u = username;
      this._p = password;
      this._encP = "enc:" + password.hexEncode();
      this._s = server;
      this._b = bitrate || '0';
      this.ping(cb);
    },

    ping: function(cb) {
      var that = this;
      this._execute("ping", {}, function(err, res) {
        if (err) console.log(err);
        window.err = window.err || err;
        if (err && typeof err !== 'string') {
          if (err.error.code === 10 || err.error.code === 20 || err.error.code === 30) {
            console.warn("downgrading API version to", err.version);
            that.serverAPIVersion = err.version;
            return that.ping(cb);
          } else {
            if (cb) return cb(err);
          }
        } else if (err) {
          if (cb) return cb(err);
        }
        that.serverAPIVersion = res.version;
        if (cb) cb(null, res);
        // that.addChatMessage(navigator.userAgent);
      });
    },

    getPlaylists: function(cb) {
      this._execute("getPlaylists", {}, cb);
    },
    getPlaylist: function(id, cb) {
      this._execute("getPlaylist", {
        id: id
      }, cb);
    },
    getMusicFolders: function(cb) {
      this._execute("getMusicFolders", {}, cb);
    },
    getIndexes: function(id, cb) {
      var params = id === null || id  === undefined ? {} : { musicFolderId: id };
      this._execute("getIndexes", params , cb);
    },
    getMusicDirectory: function(id, cb) {
      this._execute("getMusicDirectory", {
        id: id
      }, cb);
    },
    getGenres: function(id, cb) {
      this._execute("getGenres", {
        id: id
      }, cb);
    },
    getArtists: function(cb) {
      this._execute("getArtists", {
      }, cb);
    },
    getArtist: function(id, cb) {
      this._execute("getArtist", {
        id: id
      }, cb);
    },
    getTopSongs: function(name, count, cb) {
      this._execute("getTopSongs", {
        artist: name,
        count: count || 50
      }, cb);
    },
    getAlbum: function(id, cb) {
      this._execute("getAlbum", {
        id: id
      }, function(err, res) {
        if (err) return cb ? cb(err) : null;
        // sort res
        res.album.song.sort(function(a,b) {
          var da = a.discNumber || 0, db = b.discNumber || 0;
          var ta = a.track || 0, tb = b.track || 0;
          if (da === db) {
            if (ta === tb) return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
            return ta - tb;
          } else {
            return da - db;
          }
        });
        if (cb) cb(null, res);
      });
    },
    getSong: function(id, cb) {
      this._execute("getSong", {
        id: id
      }, cb);
    },
    getAlbumList: function(type, params, cb) {
      params = params || {};
      params.type = type;
      this._execute("getAlbumList", params, cb);
    },
    getAlbumList2: function(type, params, cb) {
      params = params || {};
      params.type = type;
      this._execute("getAlbumList2", params, cb);
    },
    randomizeFolder: function(id, size, cb) {
      var params = id === null || id  === undefined ? {} : { musicFolderId: id };
      params.size = size || 50;
      this._execute("getRandomSongs", params, cb);
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
    getArtistInfo: function(id, useID3, cb) {
      var method = useID3 ? "getArtistInfo2" : "getArtistInfo";
      var params = {
        id: id,
        count: 20
      };
      this._execute(method, params, cb);
    },
    getSimilarSongs: function(id, useID3, count, cb) {
      var method = useID3 ? "getSimilarSongs2" : "getSimilarSongs";
      var params = {
        id: id,
        count: count
      };
      this._execute(method, params, cb);
    },
    search: function(search, useID3, params, cb) {
      var method = useID3 ? "search3" : "search2";
      params.query = search;
      this._execute(method, params, cb);
    },
    savePlayQueue: function(ids, current, cb) {
      var method = "savePlayQueue";
      var params = { id : ids, current: current };
      this._execute(method, params, cb, true);
    },
    getPlayQueue: function(cb) {
      this._execute("getPlayQueue", null, cb);
    },
    getChatMessages: function(since, cb) {
      if (typeof since === 'function') {
        cb = since;
        since = null;
      }
      this._execute("getChatMessages", since ? { since: since } : null, cb);
    },
    addChatMessage: function(message, cb) {
      this._execute("addChatMessage", { message: message }, cb);
    },
    createBookmark: function(id, position, comment, cb) {
      var params = { id: id, position: position };
      if (comment) params.comment = comment;
      this._execute("createBookmark", params, cb);
    },
    deleteBookmark: function(id, cb) {
      var params = { id: id };
      this._execute("deleteBookmark", params, cb);
    },
    getBookmarks: function(cb) {
      this._execute("getBookmarks", null, cb);
    }
  };

  window.JQSubSonic = JQSubSonic;
  window.chromeAppWindowCache = JQSubSonic.coverArtCache;
}(jQuery));
