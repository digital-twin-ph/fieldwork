# Point data

_Created 2026-10-19 · Updated 2026-11-23_

**An input widget.** It brings located records into a workflow — one row per thing, each with a
position and whatever attributes came with it.

## What it does

It holds a set of points and the values attached to them: cases, households, facilities, pumps,
sample sites. Everything downstream that works on points starts here.

Records arrive three ways. **Import a file** — GeoJSON, a CSV with longitude and latitude
columns, a GeoPackage, or the waypoints a GPS device exports as GPX, KML or KMZ. **Place pins** by clicking a map, for a handful of locations you know. **Connect a
source** that produces points, such as a facility search.

**Coordinates in degrees** may be written as decimal numbers, such as `-5.9333`, or as degrees, minutes and seconds,
such as `05° 56' 00" S`. The second are converted to decimal degrees for the point, and the column keeps its text as
written. S and W, or a minus sign, mean south and west. A value with no hemisphere is read as north or east, and the
step says how many there were, because in much of Africa a missing S puts a place on the wrong side of the equator. A
value that cannot be read, such as 90 seconds or two hemispheres, leaves its record without a position, and the step
says which and why.

A record may have no position. That is kept rather than dropped, because a case with no recorded
address is still a case, and steps that need geometry say how many they had to leave out instead of
quietly working with fewer.

**Columns and their kinds.** Each attribute has a declared kind — number, text, or a term from a
list you give. The data quality panel profiles a column, shows which values do not match its kind,
and offers a repair. A repair is recorded with the node and appears in the run evidence; it never
overwrites what the file held.

## What you connect

| Port | What goes there |
| --- | --- |
| **records** | optional: a table with longitude and latitude columns, read as one point per row |
| **area** | optional: the study area to generate synthetic points in, offered first in **Configure…**; a Study area, or an area another step made, such as a **Combined area** across a border, once the workflow has run |

Its output is `points`, which nearly everything accepts: maps, tables, distance measurement, catchments, summaries,
rates, case series and the geoprivacy steps. A step that takes a table reads it as one too: each point a row of its
attributes, without its location.

## How to use it

The step's panel holds its **Name**, its input, one sentence saying what it holds, **Configure…**, and the records.

| In Configure… | What it does |
| --- | --- |
| **Points held here** | import a CSV, GeoPackage, GeoJSON, GPX, KML or KMZ file, generate synthetic points, or place pins on the map |
| **Points from a table** | when a table is connected: the columns holding **x (longitude)** and **y (latitude)**, named, never guessed; a **Record ID** and a **Label**, optional |

Then check the column kinds, open **Data quality** to see what is missing or malformed, and name the step for what
the records are, not where they came from.

**What the columns mean.** For points held here, **Describe columns…** works as it does in Tabular data: a label, a
unit, a description, what kind of values each column holds, and its codes, typed or proposed from a data dictionary.
A dictionary chosen there is kept with the records, and **View the data dictionary** shows it as published. Points
from a table take their meanings from that table's Tabular data step.

Hagelloch's cases carry their source's dictionary, the outbreaks package's, so every column arrives proposed. `class`
arrives as categories in no order, because the package calls it a factor; whether pre-school, first and second class
are in order is yours to say.

**Where the points came from.** Points can carry a provenance record, as Tabular data does: what they are, the work or
authority they came from, its address and its licence. A step with one writes a source note in Methods, and its work
is listed in References. Hagelloch's cases cite Pfeilsticker's 1863 thesis this way.

## Placing pins

In **Configure…**, choose **Place pushpins on map**.

| To | Do this |
| --- | --- |
| Add a pin where you are standing | **Add a pin at my location**. The browser asks first whether this page may know your location |
| Move the chosen pin to where you are | **Move this pin to my location** |
| Add a pin by eye | Click the map |
| Move a pin | Drag it, or type its longitude and latitude |
| Choose a pin | Click it, pick it from the list, or choose its row in the table under the map |
| Type a position | Decimal degrees, such as -5.9333, or degrees, minutes and seconds, such as 5° 56' 00" S |
| Find a town or district | **Find a place** asks OpenStreetMap's Nominatim, only when you press Find; the words you type are sent there. A result moves the map; it does not place a pin |
| See houses | **Basemap**: OpenStreetMap, OpenTopoMap, or a CARTO or Esri style on your own key, Esri's satellite imagery among them |
| See the ground around the pin | **Full screen** gives the map the whole window, with the pin's form still beside it. Press it again, or Escape, to come back |
| Read the ground closely | **Magnifier** puts a glass over the cursor showing the basemap enlarged, without moving the map. A click under the glass still places a pin. It needs a basemap: with the basemap off there are no tiles to magnify, and it stops at the depth the provider's tiles go to |
| Take back a change | **Undo**, the last 30 changes, before Apply. Above 20,000 records Undo is off |
| Put the form's questions in order | Under **Add a form field**, **Move up** and **Move down** beside each field; every pin's form follows |
| Show some study areas, not all | **Study areas shown**: a checkbox for each study area's outline; **Fit pins and study area** fits the ones shown |

**Where each position came from.** Every pin says how it was placed: from this device, on the map by eye, or typed. A
position from the device keeps the accuracy the device stated, in metres, and when it was taken. Dragging or typing the
position again replaces both, because the device's accuracy no longer describes it. The three are kept with the pin as
`positionSource`, `positionAccuracyM` and `positionFixedAt`, and reach the tables and the evidence like any other value.
The stated accuracy is the device's own estimate; it is not checked.

**Fields on every pin.** **Add a form field** gives each pin the same question: a key, a label, a type (text, number,
whole number, yes/no, date, or date and time), an optional default and an optional list of allowed values, which become
a dropdown. **Required on every pin** marks the field as one each pin should answer. A pin without it is named in the
summary and in the table; the pins are still saved, because a pin with a missing answer is still a place someone
recorded. A date and time is kept as it was entered, to the minute, with no time zone.

**Photos.** Each pin can hold up to ten photos, each with a caption. On a phone, **Add photos** can open the camera.
A photo is reduced to 2,048 px on its long side and kept as a JPEG; the original is not kept. Where a phone wrote the
place a photo was taken, and the pin has no position yet, the editor offers to place the pin there, and the pin then
says its position came from its photo. Otherwise it says how far from the pin the photo was taken. Either way the
location, and the camera's details, are not in the copy kept. Photos stay on this device and go into encrypted
backups only: a plain copy and a shared project name each photo by its digest and caption, without the picture.

**Pins on homes identify people.** Back the project up encrypted, and mask the points with **Donut geomasking**
before sharing a map of them.

**The table and the markers.** The table under the map lists every pin, 25 a page: its label, Category, position,
where the position came from, and any required value it lacks. Markers are coloured by **Category**, each category its
own colour with its first letter, and a pin with no category is grey. The legend names each category and how many pins
it has. Beyond eight categories, the rest share the grey.

## Waypoints from a GPS device

Choose **Import GPX from a GPS device** or **Import KML or KMZ**. Each waypoint, or each placemark that is a point,
becomes a record with its name, and its time, elevation (`elevation_m`), description and symbol where the file gives
them; a KML placemark's extended data become columns. Both formats are longitude and latitude on WGS84, so nothing is
converted. Tracks, routes and shapes are lines or areas: the editor counts them and says they were not imported,
because Point data holds points.

## Editing a value by hand

**Data quality**'s **Records** tab shows the records as the steps after this one read them, a page at a time, each value
in a box. Change a value and leave the box: it is kept as an **edit** on this step, with the value it replaced and when,
and the run applies it to a copy of the records. The file is not changed. An empty value can be filled the same way; such
edits are counted apart, because a supplied value is not a reading. **Edits (n)** lists every edit, newest first, each
with **Remove**, which takes it back.

An edit is applied only where the record still holds the value it was made against. If the data has changed under it,
after a new import, the edit is not applied and Data quality says so. The run's record states each edit, before and
after (`fw:CellEdit`). Experiment 214.

## What it will not do

It does not clean data silently. Nothing is coerced, dropped or filled in; what cannot be read is
reported and left for you to decide.

It does not join one set of records to another. Two sets that share no key stay two sets.

It does not know what a row means. Whether 250 rows are 250 people or 250 addresses carrying 489
events is something your labels and your weights have to say.

## Worked examples that use it

**John Snow: where were the deaths?** loads 250 death locations and eight pumps. **Measles in Hagelloch,
1861** loads a 188-case line list.

## History

### 2026-11-26 · Its code out of app.ts (0.19.1)

The Inspector, its sentence and the dialog naming a table's longitude and latitude columns moved into
`src/point-data-ui.ts`. Nothing they show or do changed.

### 2026-11-23 · An Excel workbook (0.16.0)

**Import Excel** reads a workbook's first sheet carrying a header row, exactly as a CSV is read, and proposes the
longitude and latitude columns by name. A spreadsheet of sites had to be saved as a CSV first.

### 2026-11-23 · The table's coordinate columns are proposed (0.15.0)

Reading points from a table, **Configure…** proposed nothing: both selects opened on *Choose a column…* though the
step's own CSV import has always proposed by name. It now proposes the longitude, the latitude, the record ID and the
label from those same names. They are shown in the selects and can be changed, and a run still reads the mapping
stored here rather than guessing.

### 2026-11-23 · A CSV that is not UTF-8 (0.14.1)

A CSV whose bytes are not UTF-8 is read as Windows-1252, as Excel on Windows writes it, so an accented place name
reads as it should rather than as replacement characters.

### 2026-11-22 · The form's order (0.14.0)

A pin's form listed its fields in the order they were added. Each can now be moved up or down, and every pin's form
follows. Experiment 09's last open item.

### 2026-11-22 · Pins in the field (0.13.0)

A pin was placed by eye on the map or typed, and nothing said which. Now a pin can be added where the device is, and
every pin says where its position came from, with the device's stated accuracy. A form field can be required, a field
can hold a date and a time, the editor lists the pins as a table, and markers are coloured by Category. A position can
be typed in degrees, minutes and seconds, a place found by name, a satellite basemap chosen, and a change undone. Pins
hold photos. GPX, KML and KMZ waypoints import. The editor is the standard dialog: Cancel and Apply where Save Edits
was. Experiment 09's open items 1 to 14.

**What it does not establish:** not tried on a phone, with a real GPS fix, a real phone photo or a real handheld's
GPX; the tests give the browser a position, a photo and a file.

### 2026-11-21 · A study area connected to generate in (0.12.0)

Its generator chose from a list of the workflow's Study areas, with nothing on the canvas to say which. Now an area connected to it is offered first, and an
area another step made (a Combined area of two countries) can be generated in after a run. Unconnected, the list is as
before.

### 2026-11-19 · Up to 250,000 records (0.11.0)

Point data took at most 2,000 records from a file, pins, generated points or reprojection, and files of at most 5 MB:
numbers chosen when the widget was new. It now takes 250,000 records and files of up to 40 MB, the limits measured
for tables, and every place it reads points follows the one number. The maps and tables it feeds were measured at the
same sizes; Map's manual has the times.

**What it does not establish:** a 250,000-row CSV imported through this dialog was not timed; the measurement read the
points from a workflow file and from a table.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/point_input.md](../widget-specs/point_input.md).*
