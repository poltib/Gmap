// Global variables definition.
var NUMBERS_DOT_THREENUMBERS = /^(\d+)(\d{3})(\.\d+)/;
var THREENUMBERS_DOT_NUMBERS = /^(\d{3})(\.\d+)/;
var NUMBERS_DOT_NUMBERS = /^(\d+)(\.\d+)/;
var COORD = /^(\d+\.)(\d{0,13})(\d+)/;
var poly = 1;
var chart = 1;
var map = 1;
var elevations = 1;
var SAMPLES = 100;
var mousemarker = null;
var track_path = null;
var newRoute = [];
var dist_markers = [];
var jsInput = null;
var elevationReqActive = false;
var end_marker = null;
var start_marker = null;
var path = new google.maps.MVCArray();
var gm_service = new google.maps.DirectionsService();
var elevation_service = new google.maps.ElevationService();
var previous_point = [];

google.load("visualization", "1", {
    packages: ["columnchart"]
});

google.maps.event.addDomListener(window, 'load', load_map);

function load_map() {
    // Init the Gmap.
    gm_init = function() {
        var map, gm_center, gm_map_type, map_options, mapTypeIds;
        mapTypeIds = [];
        mapTypeIds.push(google.maps.MapTypeId.ROADMAP);
        mapTypeIds.push(google.maps.MapTypeId.TERRAIN);
        mapTypeIds.push(google.maps.MapTypeId.SATELLITE);
        mapTypeIds.push(google.maps.MapTypeId.HYBRID);
        mapTypeIds.push("OSM");
        mapTypeIds.push("TFL");
        gm_center = new google.maps.LatLng(50.633333, 5.566667);
        gm_map_type = google.maps.MapTypeId.ROADMAP;
        map_options = {
            zoom: 14,
            center: gm_center,
            panControl: false,
            backgroundColor: "rgba(0,0,0,0)",
            disableDoubleClickZoom: true,
            scrollwheel: false,
            draggableCursor: "crosshair",
            mapTypeControlOptions: {
                mapTypeIds: mapTypeIds,
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            }
        };
        map = new google.maps.Map(this.map_canvas, map_options);
        // Add OpenStreetMap type.
        map.mapTypes.set("OSM", new google.maps.ImageMapType({
            getTileUrl: function(coord, zoom){
                return "http://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
            },
            tileSize: new google.maps.Size(256, 256),
            name: "OSM",
            maxZoom: 18
        }));
        // Add TFL type.
        map.mapTypes.set("TFL", new google.maps.ImageMapType({
            getTileUrl: function(coord, zoom){
                return "http://tile.thunderforest.com/landscape/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
            },
            tileSize: new google.maps.Size(256, 256),
            name: "TF Landscape",
            maxZoom: 18
        }));
        return map;
    };

    // init the polyline.
    poly_init = function() {
        var poly_options = {
            geodesic:true, 
            map: map, 
            strokeColor: 'rgba(0,0,0,0.6)'
        };
        return new google.maps.Polyline(poly_options);
    };

    // Draw the path on the Gmap.
    draw_path = function(path) {
        if (elevationReqActive || !path) {
            return;
        }
        // Create a PathElevationRequest object using this array.
        // Ask for 100 samples along that path.
        var pathRequest = {
            path: path,
            samples: SAMPLES
        };
        elevationReqActive = true;
        // Initiate the path request.
        return elevation_service.getElevationAlongPath(pathRequest, plot_elevation);
    };

    // Display the elevation along the path.
    plot_elevation = function(results, status) {
        elevationReqActive = false;
        if(status !== google.maps.ElevationStatus.OK) {
            return;
        }
        elevations = results;
        // Extract the data from which to populate the chart.
        // Because the samples are equidistant, the 'Sample'
        // column here does double duty as distance along the
        // X axis.
        data = new google.visualization.DataTable();
        data.addColumn('string', 'Distance');
        data.addColumn('number', 'Elevation');
        for (i = 0; i < results.length; i += 1) {
            data.addRow(['', elevations[i].elevation]);
        }

        // Draw the chart using the data within its DIV.
        elevation_chart.style.display = 'block';
        options = {
            height: 100,
            dataOpacity: 0.8,
            bar: {groupWidth: "100%"},
            legend: { position: "none" },
            titleY: 'Elevation (m)',
            fill: '#00AA00',
            vAxis: {minValue: 0},
            colors: ["#3498db"],
            focusBorderColor: '#00AA00',
            tooltip: { trigger: 'none' },
        };
        chart.draw(data, options);
    };

    // Add listener on the chart the show the position on the path.
    add_chart_listener = function() {
        infowindow = new google.maps.InfoWindow({});
        google.visualization.events.addListener(chart, 'onmouseover', function(e) {
            if(mousemarker === null) {
                mousemarker = new google.maps.Marker({
                    position: elevations[e.row].location,
                    map: map,
                    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                });
                contentStr = "elevation="+elevations[e.row].elevation+"m";
                mousemarker.contentStr = contentStr;
                google.maps.event.addListener(mousemarker, 'click', function(evt) {
                    mm_infowindow_open = true;
                    infowindow.setContent(this.contentStr);
                    infowindow.open(map,mousemarker);
                });
            } else {
                mousemarker.setMap(map);
                contentStr = "elevation="+elevations[e.row].elevation+"m";
                mousemarker.contentStr = contentStr;
                infowindow.setContent(contentStr);
                mousemarker.setPosition(elevations[e.row].location);
            }
        });
    };

    // Init the track.
    create_track = function(latLng, map) {
        path.push(latLng);
        poly.setPath(path);
        start_marker = new google.maps.Marker({
            map: map,
            position: latLng,
            icon: "http://maps.google.com/mapfiles/dd-start.png"
        });
    };

    // Extend the track.
    extend_track = function(origin, destination) {
        gm_service.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.DirectionsTravelMode.WALKING
        }, function(result, status) {
            if(status !== google.maps.DirectionsStatus.OK) {
                return;
            }
            for (var i = 0; i < result.routes[0].overview_path.length; i++) {
                path.push(result.routes[0].overview_path[i]);
                draw_path(path.j);
                update_dist();
                end_marker.setMap(map);
                end_marker.setPosition(destination);
            }
        });
    };

    // Update the distance.
    update_dist = function() {
        var track_dist = google.maps.geometry.spherical.computeLength(poly.getPath()).toString();
        if(track_dist.match(THREENUMBERS_DOT_NUMBERS) !== null) {
            track_dist = track_dist.replace(THREENUMBERS_DOT_NUMBERS, '0.$1');
        } else {
            track_dist = track_dist.replace(NUMBERS_DOT_THREENUMBERS, '$1.$2');
            dist.childNodes[0].textContent = track_dist + 'km';
        }
    };

    // Truncate the track.
    truncate_track = function() {
        if(path.j.length <= 2) {
            clear_all();
        } else {
            path.j.pop();
            poly.setPath(path);
            draw_path(path.j);
            new_pos = gm_center = new google.maps.LatLng(path.j[path.j.length - 1].lat(), path.j[path.j.length - 1].lng());
            end_marker.setPosition(new_pos);
            update_dist();
        }
    };

    // Undo action.
    undo_action = function() {
        if(previous_point.length >= 2) {
            tmp_previous_point = path.j.length - previous_point[previous_point.length - 1];
            tmp_path = path.j.slice(0).reverse();
            for (var i = 0; i < path.j.slice(0).reverse().length; i++) {
              if (i < tmp_previous_point) {
                tmp_path.shift();
              }
            }
            path.j = tmp_path.slice(0).reverse();
            poly.setPath(path);
            draw_path(path.j);
            new_pos = gm_center = new google.maps.LatLng(path.j[path.j.length - 1].lat(), path.j[path.j.length - 1].lng());
            end_marker.setPosition(new_pos);
            previous_point.pop();
            update_dist();
        } else {
            clear_all();
        }
    };

    // Clear the map and the chart.
    clear_all = function() {
        path.clear();
        previous_point = [];
        elevation_chart.style.display = 'none';
        dist.childNodes[0].nodeValue = '0km';
        if(start_marker !== null) {
            start_marker.setMap(null);
        }
        if(end_marker !== null) {
            end_marker.setMap(null);
        }
        if(mousemarker !== null) {
            mousemarker.setMap(null);
        }
    }

    // Global function to init the app.
    init = function() {
        clear_all();
        var dist = document.getElementById('dist');
        var reset = document.getElementById('reset');
        var close = document.getElementById('close');
        var clear = document.getElementById('clear');
        var full = document.getElementById('full');
        var back_button = document.getElementById('back');
        var tiny_button = document.getElementById('tiny');
        var map_canvas = document.getElementById('map_canvas');
        var elevation_chart = document.getElementById('elevation_chart');
        chart = new google.visualization.ColumnChart(elevation_chart);
        map = gm_init();
        map.setOptions({draggableCursor:"crosshair"});
        poly = poly_init();
        add_chart_listener();
        end_marker = new google.maps.Marker({
            map: map,
            icon: "http://maps.google.com/mapfiles/dd-end.png"
        });
        reset.addEventListener('click', function(evt) {
            clear_all();
        });

        tiny_button.addEventListener('click', function(evt) {
            truncate_track();
        });

        back_button.addEventListener('click', function(evt) {
            undo_action();
        });

        close.addEventListener('click', function(evt) {
            if(path.getLength() != 0) {
                extend_track(path.getAt(path.j.length - 1),path.getAt(0));
            }
        });
        google.maps.event.addListener(map, 'click', function(evt) {
            if(path.getLength() == 0) {
                create_track(evt.latLng, map);
            } else {
                previous_point.push(path.j.length - 1);
                extend_track(path.getAt(path.j.length - 1), evt.latLng);
            }
        });
    }

    // Launch app.
    init();
};