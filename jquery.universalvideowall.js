/**
 * jQuery Universal Video Wall
 * @author Charaf Salmi
 * @version 1.0
 * Copyright 2012, Charaf Salmi
 * Dual licensed under the MIT or GPL Version 2 licenses
 * @description Fetch your videos from various video-sharing websites and display them in a beautiful way.
 */
"use strict";
(function ($) {
    $.fn.universalvideowall = function (options) {
        var defaults = {
            accounts: [],
            template: '<ul class="uvwall">{{#tracks}}<li>{{title}}</li><ul><li>{{hits}}</li></ul>{{/tracks}}</ul>',
            final_callback: function ()  {
                return true;
            },
            starter_callback: function () {
                return true;
            },
            processor_callback: function ()  {
                return true;
            },
            renderer_callback: function ()  {
                return true;
            },
            sort_function: function (a, b) {
                var criteria1 = a.date;
                var criteria2 = b.date;
                return ((criteria1 > criteria2) ? -1 : ((criteria1 < criteria2) ? 1 : 0));
            }
        };
        var internals = {
            queries: [],
            tracks: [],
            html: '',
            starter_done: false,
            processor_done: false,
            renderer_done: false,
            target: $(this)
        };
        var schemes = {
            account: {
                type: '',
                identifier: ''
            },
            query: {
                id: '',
                api: '',
                account: {},
                response: {}
            },
            track: {
                id: 0,
                title: '',
                description: '',
                date: '',
                duration: '',
                hits: 0,
                playerLink: '',
                platform: '',
                platformLink: '',
                platform_identifier: '',
                thumbnail: {
                    small: '',
                    normal: '',
                    large: ''
                }
            }
        };
        options = $.extend({}, defaults, options);
        options = $.extend({}, internals, options);
        options = $.extend({}, schemes, options);

        function starter() {
            //Check dependencies
            //for this first version we will assume that all dependencies are ok
            if (!options.starter_callback()) {
                return false;
            }
            else {
                options.starter_done = true;
                processor();
                return true;
            }
        }

        function processor() {
            //Parse accounts
            $.each(options.accounts, function (index, account) {
                var api = "";
                index = index;
                switch (account.type) {
                case "dailymotion":
                    api = "https://api.dailymotion.com/videos?fields=allow_embed,aspect_ratio%2Ccreated_time%2Cdescription%2Cduration%2Cembed_html%2Cembed_url%2Cid%2Conair%2Cowner.id%2Cowner.screenname%2Cstatus%2Cswf_url%2Cthumbnail_large_url%2Cthumbnail_medium_url%2Cthumbnail_small_url%2Cthumbnail_url%2Ctitle%2Curl%2Cviews_total&sort=recent&limit=100&owner=";
                    break;
                case "rutube":
                    api = "http://rutube.ru/cgi-bin/jsapi.cgi?rt_count=1000&rt_developer_key=";
                    break;
                case "youtube":
                    api = "http://gdata.youtube.com/feeds/api/videos?alt=json&orderby=published&format=5&safeSearch=none&v=2&author=";
                    break;
                }
                options.queries.push({
                    id: '',
                    'api': api + account.identifier,
                    'account': account,
                    response: ''
                });
            });
            //Fetching
            var queue = $.manageAjax.create('queue', {
                queue: true
            });
            $.each(options.queries, function (index, query) {
                switch (query.account.type) {
                case "dailymotion":
                    options.queries[index].id = queue.add({
                        dataType: "json",
                        url: query.api,
                        type: 'GET',
                        success: function (response, textStatus, xhr, am_options) {
                            textStatus = textStatus;
                            xhr = xhr;
                            $.each(options.queries, function (index, value) {
                                if (value.id == am_options.xhrID) {
                                    options.queries[index].response = response;
                                    return;
                                }
                            });
                        }
                    });
                    break;
                case "rutube":
                    options.queries[index].id = queue.add({
                        dataType: "script",
                        url: query.api,
                        type: 'GET',
                        success: function (response, textStatus, xhr, am_options) {
                            textStatus = textStatus;
                            xhr = xhr;
                            response = (window.tracks);
                            $.each(options.queries, function (index, value) {
                                if (value.id == am_options.xhrID) {
                                    options.queries[index].response = response;
                                    return;
                                }
                            });
                        }
                    });
                    break;
                case "youtube":
                    options.queries[index].id = queue.add({
                        dataType: "json",
                        url: query.api,
                        type: 'GET',
                        success: function (response, textStatus, xhr, am_options) {
                            textStatus = textStatus;
                            xhr = xhr;
                            $.each(options.queries, function (index, value) {
                                if (value.id == am_options.xhrID) {
                                    options.queries[index].response = response;
                                    return;
                                }
                            });
                        }
                    });
                    break;
                }
            });
            //Convert fetched json to tracks
            $(document).bind('queueAjaxStop', function (e, data) {
                var russian_monthes = {
                    'янв': '01',
                    'фев': '02',
                    'мар': '03',
                    'апр': '04',
                    'май': '05',
                    'июн': '06',
                    'июл': '07',
                    'авг': '08',
                    'сен': '09',
                    'окт': '10',
                    'ноя': '11',
                    'дек': '12'
                };

                function my_trim(t) {
                    return $('<span />').html(t).text().replace("'", "'").replace('"', "'").replace("'", "'");
                }

                function my_rutube_id(x) {
                    return x.replace('?rt_movie_id=', '');
                }

                function format_rutube_date(d) {
                    d = my_trim(d);
                    for (var value in russian_monthes)  {
                        d = d.replace(new RegExp(value, "g"), russian_monthes[value]);
                    }
                    d = d[6] + d[7] + d[8] + d[9] + '-' + d[3] + d[4] + '-' + d[0] + d[1] + 'T00:00:00.000Z';
                    return d; //from 00 00 0000 to 0000-00-00T00:00:00.000Z
                }
                $.each(options.queries, function (index, query) {
                    index = index;
                    switch (query.account.type) {
                    case "dailymotion":
                        $.each(query.response.list, function (index, entry) {
                            index = index;
                            var true_date = (new Date(entry.created_time * 1000)).toISOString();
                            var track = {
                                id: entry.id,
                                title: entry.title,
                                description: entry.description,
                                date: true_date,
                                duration: entry.duration,
                                hits: entry.views_total,
                                playerLink: entry.swf_url,
                                platform: query.account.type,
                                platformLink: entry.url,
                                thumbnail: {
                                    small: entry.thumbnail_small_url,
                                    normal: entry.thumbnail_medium_url,
                                    large: entry.thumbnail_large_url
                                },
                                platform_identifier: query.account.identifier
                            };
                            options.tracks.push(track);
                        });
                        break;
                    case "rutube":
                        $.each(query.response, function (index, entry) {
                            index = index;
                            var track = {
                                id: my_rutube_id(entry.movieLink),
                                title: my_trim(entry.title),
                                description: my_trim(entry.description),
                                date: format_rutube_date(entry.recordDate),
                                duration: entry.duration,
                                hits: entry.hits,
                                playerLink: entry.playerLink,
                                platform: query.account.type,
                                platformLink: 'http://www.rutube.ru/tracks/' + my_rutube_id(entry.movieLink) + '.html',
                                thumbnail: {
                                    small: entry.thumbnailSmallLink,
                                    normal: entry.thumbnailMediumLink,
                                    large: entry.thumbnailLink
                                },
                                platform_identifier: query.account.identifier
                            };
                            options.tracks.push(track);
                        });
                        break;
                    case "youtube":
                        $.each(query.response.feed.entry, function (index, entry) {
                            index = index;
                            var track = {
                                id: entry.media$group.yt$videoid.$t,
                                title: entry.media$group.media$title.$t,
                                description: entry.media$group.media$description.$t,
                                date: entry.media$group.yt$uploaded.$t,
                                duration: entry.media$group.yt$duration.seconds,
                                hits: entry.yt$statistics.viewCount,
                                playerLink: entry.media$group.media$content[0].url,
                                platform: 'youtube',
                                platformLink: entry.media$group.media$player.url,
                                thumbnail: {
                                    small: entry.media$group.media$thumbnail[0].url,
                                    normal: entry.media$group.media$thumbnail[1].url,
                                    large: entry.media$group.media$thumbnail[2].url
                                },
                                platform_identifier: query.account.identifier
                            };
                            options.tracks.push(track);
                        });
                        break;
                    }
                });
                options.tracks.sort(options.sort_function);
                //little trick to ease the renderer's work
                options.tracks = {
                    tracks: options.tracks
                };
                //---
                if (!options.processor_callback()) {
                    return false;
                }
                else {
                    options.processor_done = true;
                    renderer();
                    return true;
                }
            });
        }

        function renderer() {
            options.html = Mustache.to_html(options.template, options.tracks);
            options.target.append(options.html);
            if (!options.renderer_callback()) {
                return false;
            }
            else {
                options.renderer_done = true;
                return options.final_callback() && true;
            }
        }

        function run() {
            starter();
        }
        run();
        return $(this);
    };
})(jQuery);