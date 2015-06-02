// Stupid jQuery table plugin.

(function ($) {
    $.fn.stupidtable = function (sortFns) {
        return this.each(function () {
            var $table = $(this);
            sortFns = sortFns || {};
            sortFns = $.extend({}, $.fn.stupidtable.default_sort_fns, sortFns);
            $table.data('sortFns', sortFns);

            $table.on("click.stupidtable", "thead th", function () {
                $(this).stupidsort();
            });
        });
    };


    // Expects $("#mytable").stupidtable() to have already been called.
    // Call on a table header.
    $.fn.stupidsort = function (force_direction) {
        var $this_th = $(this);
        var th_index = 0; // we'll increment this soon
        var dir = $.fn.stupidtable.dir;
        var $table = $this_th.closest("table");
        var datatype = $this_th.data("sort") || null;

        // No datatype? Nothing to do.
        if (datatype === null) {
            return;
        }

        // Account for colspans
        $this_th.parents("tr").find("th").slice(0, $(this).index()).each(function () {
            var cols = $(this).attr("colspan") || 1;
            th_index += parseInt(cols, 10);
        });

        var sort_dir;
        if (arguments.length == 1) {
            sort_dir = force_direction;
        }
        else {
            sort_dir = force_direction || $this_th.data("sort-default") || dir.ASC;
            if ($this_th.data("sort-dir"))
                sort_dir = $this_th.data("sort-dir") === dir.ASC ? dir.DESC : dir.ASC;
        }


        $table.trigger("beforetablesort", { column: th_index, direction: sort_dir });

        // More reliable method of forcing a redraw
        $table.css("display");

        // Run sorting asynchronously on a timout to force browser redraw after
        // `beforetablesort` callback. Also avoids locking up the browser too much.
        setTimeout(function () {
            // Gather the elements for this column
            var column = [];
            var sortFns = $table.data('sortFns');
            var sortMethod = sortFns[datatype];
            var trs = $table.children("tbody").children("tr");

            // Extract the data for the column that needs to be sorted and pair it up
            // with the TR itself into a tuple. This way sorting the values will
            // incidentally sort the trs.
            trs.each(function (index, tr) {
                var $e = $(tr).children().eq(th_index);
                var sort_val = $e.data("sort-value");

                // Store and read from the .data cache for display text only sorts
                // instead of looking through the DOM every time
                if (typeof (sort_val) === "undefined") {
                    var txt = $e.text();
                    $e.data('sort-value', txt);
                    sort_val = txt;
                }
                column.push([sort_val, tr]);
            });

            // Sort by the data-order-by value
            column.sort(function (a, b) { return sortMethod(a[0], b[0]); });
            if (sort_dir != dir.ASC)
                column.reverse();

            // Replace the content of tbody with the sorted rows. Strangely
            // enough, .append accomplishes this for us.
            trs = $.map(column, function (kv) { return kv[1]; });
            $table.children("tbody").append(trs);

            // Reset siblings
            $table.find("th").data("sort-dir", null).removeClass("sorting-desc sorting-asc");
            $this_th.data("sort-dir", sort_dir).addClass("sorting-" + sort_dir);

            $table.trigger("aftertablesort", { column: th_index, direction: sort_dir });
            $table.css("display");
        }, 10);

        return $this_th;
    };

    // Call on a sortable td to update its value in the sort. This should be the
    // only mechanism used to update a cell's sort value. If your display value is
    // different from your sort value, use jQuery's .text() or .html() to update
    // the td contents, Assumes stupidtable has already been called for the table.
    $.fn.updateSortVal = function (new_sort_val) {
        var $this_td = $(this);
        if ($this_td.is('[data-sort-value]')) {
            // For visual consistency with the .data cache
            $this_td.attr('data-sort-value', new_sort_val);
        }
        $this_td.data("sort-value", new_sort_val);
        return $this_td;
    };

    // ------------------------------------------------------------------
    // Default settings
    // ------------------------------------------------------------------
    $.fn.stupidtable.dir = { ASC: "asc", DESC: "desc" };
    $.fn.stupidtable.default_sort_fns = {
        "int": function (a, b) {
            first = parseInt(a, 10); // the result of parseInt can be a non int like a character (a,B,C,.,-)
            second = parseInt(b, 10);

            if (isNaN(first) && isNaN(second)) {
                return 0;
            }
            
            if (isNaN(first)) { // if first is NaN then it is lower than second and goes to the begin of the table
                return -1
            }

            if (isNaN(second)) {// if second is NaN then first is a number and is greater than NaN 
                return 1;
            }

            return first - second;

        },
        "float": function (a, b) {
            return parseFloat(a) - parseFloat(b);
        },
        "string": function (a, b) {
            return a.trim().localeCompare(b.trim());
        },
        "string-ins": function (a, b) {
            a = a.trim().toLocaleLowerCase();
            b = b.trim().toLocaleLowerCase();
            return a.localeCompare(b);
        },
        "date": function (a, b) {
            begin =  Date.parse(a);
            end = Date.parse(b);


            if (isNaN(begin)) { 
                return -1
            }

            if (isNaN(end)) {
                return 1;
            }


            if (begin < end) {
                return -1;
            }

            if (begin > end) {
                return 1;
            }
            
            return 0;

        }


    };
})(jQuery);

