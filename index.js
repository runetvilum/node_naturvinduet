/*jslint nomen: true */
/*jslint plusplus: true */
/*global require, console, __dirname, process, Buffer, setTimeout*/
(function () {
    'use strict';
    var Firebase = require("firebase"),
        config = require('./config'),
        winston = require('winston'),
        fs = require('fs'),
        Promise = require('promise'),
        Queue = require('firebase-queue'),
        request = require('request'),
        ref = new Firebase("https://naturvinduet.firebaseio.com/");
    winston.add(winston.transports.DailyRotateFile, {
        filename: 'naturvinduet.log'
    });
    winston.remove(winston.transports.Console);
    winston.info('start');
    ref.authWithCustomToken(config.firebase_token, function (error, authData) {
        if (error) {
            winston.info(error);
        } else {
            var obsQueue = new Queue(ref.child('queue'), function (obs, progress, resolve, reject) {
                winston.info(obs.obs);
                ref.child('data').child(obs.obs).once('value', function (child) {
                    var val = child.val(),
                        key = child.key();
                    ref.child('images/data').child(key).once('value', function (child) {
                        var img = child.val(),
                            ss = img.split(",");
                        ref.child('users').child(val.uid).once('value', function (child) {
                            var user = child.val(),
                                formData = {
                                    source: {
                                        value: new Buffer(ss[1], 'base64'),
                                        options: {
                                            filename: 'image.jpg',
                                            contentType: 'image/jpg'
                                        }
                                    },
                                    message: "Oprettet af " + user[user.auth.provider].displayName + "\n\n" + val.title + "\n\n" + val.description

                                };
                            request.post({
                                url: 'https://graph.facebook.com/v2.3/1629813720573531/photos',
                                //url: 'https://graph.facebook.com/v2.3/1659704974251258/photos',
                                formData: formData,
                                qs: {
                                    access_token: config.access_token
                                }
                            }, function optionalCallback(err, httpResponse, body) {
                                if (err) {
                                    reject(err);
                                    winston.info("reject", err);
                                } else {
                                    winston.info("resolve", obs.obs);
                                    resolve();
                                }
                            });
                        }, function (error) {
                            reject();
                            winston.info("reject", error);
                        });
                    }, function (error) {
                        reject();
                        winston.info("reject", error);
                    });
                }, function (error) {
                    reject();
                    winston.info("reject", error);
                });
            });
            ref.child('queue/tasks').orderByChild('_state').equalTo('error').on('child_added', function (child) {
                setTimeout(function () {
                    var v = child.val(),
                        id = child.key(),
                        s = v._error_details.previous_state.replace("_in_progress", "");
                    winston.info("error", v);
                    ref.child('queue/tasks').child(id).child('_state').set(s);
                }, 60000);
            });
            setTimeout(function () {
                ref.child('queue/tasks').push({
                    obs: '-JrC3wvbkWgWI_6LMoyE'
                });
            }, 1000);
        }
    });
    /*Get access token
    https://developers.facebook.com/tools/explorer/451552425003279/?method=GET&path=me%3Ffields%3Did%2Cname
    Vælg application naturvinduet og access token naturvinduet
    Vælg request publish_pages
    https://developers.facebook.com/tools/debug/accesstoken?q=CAAGarz3jyQ8BAEpKZAHZC5XZCqJeEDA8n8suPWhPZCRM1fZBuzPtDQLOdavLxx9NozhVZBIlsfwquGNgIOEGJntEVs0e4vUJ0RkeqU3re7U2QC1tNRbPOO3cpKWwTYq3kiMoXqni5mCa6WvptZCY0GtwMykLHBdspgJhy0buCQYp2ytPEJgwzW9dQ11MFBFGOQZD&version=v2.3
    vælg extend access token
    vælg debug
    */

}());