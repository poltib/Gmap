var NUMBER_DOT_TWONUMBERS, SAMPLES, alert, calc_bounds, chart, display_on_map, draw_path, elevation_req_active, elevation_service, elevations, gm_init, gm_service, path, plot_elevation, poly_init;

NUMBER_DOT_TWONUMBERS = /^(\d+.)(\d{0,2})(\d+)/;

poly = 1;

chart = 1;

elevations = 1;

SAMPLES = 200;

elevation_req_active = false;

path = new google.maps.MVCArray();

gm_service = new google.maps.DirectionsService();

elevation_service = new google.maps.ElevationService();

google.load("visualization", "1", {
  packages: ["columnchart"]
});

google.maps.event.addDomListener(window, 'load', load_map);

function load_map() {
  gm_init = function() {
    var gm_center, gm_map_type, map_options;
    gm_center = new google.maps.LatLng(50.633333, 5.566667);
    gm_map_type = google.maps.MapTypeId.ROADMAP;
    map_options = {
      zoom: 14,
      center: gm_center,
      panControl: false,
      backgroundColor: "rgba(0,0,0,0)",
      mapTypeControl: false,
      disableDoubleClickZoom: true,
      scrollwheel: false,
      draggableCursor: "crosshair"
    };
    return new google.maps.Map(this.map_canvas, map_options);
  };

  poly_init = function(map) {
    var poly_options;
    poly_options = {
      draggable: true,
      editable: true,
      geodesic: true,
      map: map,
      strokeColor: 'rgba(0,0,0,0.6)'
    };
    return new google.maps.Polyline(poly_options);
  };

  draw_path = function(path) {
    var pathRequest;
    if (elevation_req_active || !path) {
      return;
    }
    pathRequest = {
      path: path,
      samples: SAMPLES
    };
    elevation_req_active = true;
    return elevation_service.getElevationAlongPath(pathRequest, plot_elevation);
  };

  plot_elevation = function(results, status) {
    var data, i;
    elevation_req_active = false;
    if (status !== google.maps.ElevationStatus.OK) {
      return;
    }
    elevations = results;
    data = new google.visualization.DataTable();
    data.addColumn('string', 'Sample');
    data.addColumn('number', 'Elevation');
    for (i = 0; i < results.length; i += 1) {
      data.addRow(['', elevations[i].elevation]);
    }
    elevation_chart.style.display = 'block';
    chart.draw(data, {
      width: 'auto',
      height: 90,
      legend: 'none',
      titleY: 'Elevation (m)'
    });
  };

  grow_path = function(origin, destination) {
    return gm_service.route({
      origin: origin,
      destination: destination,
      travelMode: google.maps.DirectionsTravelMode.WALKING
    }, function(result, status) {
      var coords, i, _ref;
      if (status !== google.maps.DirectionsStatus.OK) {
        return;
      }
      _ref = result.routes[0].overview_path;
      for (i = 0; i < _ref.length; i += 1) {
        path.push(_ref[i]);
      }
      draw_path(path.j);
      dist.childNodes[0].textContent = poly.inKm() + 'km';
    });
  };

  google.maps.LatLng.prototype.kmTo = function(a) {
    var b, c, d, e, f, g, ra;
    e = Math;
    ra = e.PI / 180;
    b = this.lat() * ra;
    c = a.lat() * ra;
    d = b - c;
    g = this.lng() * ra - a.lng() * ra;
    f = 2 * e.asin(e.sqrt(e.pow(e.sin(d / 2), 2) + e.cos(b) * e.cos(c) * e.pow(e.sin(g / 2), 2)));
    return f * 6378.137;
  };
  google.maps.Polyline.prototype.inKm = function(n) {
    var a, i, len, pathLenght;
    a = this.getPath(n);
    len = a.getLength() - 1;
    pathLenght = 0;
    for (i = 0; i < len; i += 1) {
      pathLenght += a.getAt(i).kmTo(a.getAt(i + 1));
    }
    return pathLenght.toString().replace(NUMBER_DOT_TWONUMBERS, '$1$2');
  };


  var clear, close, dist, divMap, elevation_chart, grow_path, map, reset;
  dist = document.getElementById("dist");
  reset = document.getElementById("reset");
  close = document.getElementById("close");
  clear = document.getElementById("clear");
  full = document.getElementById("full");
  divMap = document.getElementById("map_canvas");
  elevation_chart = document.getElementById('elevation_chart');
  chart = new google.visualization.ColumnChart(elevation_chart);
  map = gm_init();
  poly = poly_init(map);

  google.maps.event.addListener(map, 'click', function(evt) {
    if (path.getLength() === 0) {
      path.push(evt.latLng);
      poly.setPath(path);
    } else {
      return grow_path(path.getAt(path.getLength() - 1), evt.latLng);
    }
  });

  reset.addEventListener('click', function(evt) {
    path.clear();
    elevation_chart.style.display = 'none';
    dist.childNodes[0].nodeValue = 'dist';
  });

  close.addEventListener('click', function(evt) {
    if (path.getLength() !== 0) {
      return grow_path(path.getAt(path.getLength() - 1), path.getAt(0));
    }
  });
};
