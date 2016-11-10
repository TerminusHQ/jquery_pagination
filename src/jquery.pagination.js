/**
 * This jQuery plugin displays pagination links inside the selected elements.
 *
 * This plugin needs at least jQuery 1.4.2
 *
 * @author Gabriel Birke (birke *at* d-scribe *dot* de)
 * @version 2.2
 * @param {int} maxentries Number of entries to paginate
 * @param {Object} opts Several options (see README for documentation)
 * @return {Object} jQuery Object
 */
 (function($){
  /**
   * @class Class for calculating pagination values
   */
  $.PaginationCalculator = function(maxentries, opts) {
    this.maxentries = maxentries;
    this.opts = opts;
  };

  $.extend($.PaginationCalculator.prototype, {
    /**
     * Calculate the maximum number of pages
     * @method
     * @returns {Number}
     */
    numPages:function() {
      return Math.ceil(this.maxentries/this.opts.items_per_page);
    },
    /**
     * Calculate start and end point of pagination links depending on
     * current_page and num_display_entries.
     * @returns {Array}
     */
    getInterval:function(current_page)  {
      var ne_half = Math.floor(this.opts.num_display_entries/2);
      var np = this.numPages();
      var upper_limit = np - this.opts.num_display_entries;
      var start = current_page > ne_half ? Math.max( Math.min(current_page - ne_half, upper_limit), 0 ) : 0;
      var end = current_page > ne_half?Math.min(current_page+ne_half + (this.opts.num_display_entries % 2), np):Math.min(this.opts.num_display_entries, np);
      return {start:start, end:end};
    }

  });

  // Initialize jQuery object container for pagination renderers
  $.PaginationRenderers = {};

  /**
   * @class Default renderer for rendering pagination links
   */
  $.PaginationRenderers.defaultRenderer = function(maxentries, opts) {
    this.maxentries = maxentries;
    this.opts = opts;
    this.pc = new $.PaginationCalculator(maxentries, opts);
  };
  $.extend($.PaginationRenderers.defaultRenderer.prototype, {
    /**
     * Helper function for generating a single link (or a span tag if it's the current page)
     * @param {Number} page_id The page id for the new item
     * @param {Number} current_page
     * @param {Object} appendopts Options for the new item: text and classes
     * @returns {jQuery} jQuery object containing the link
     */
    createLink:function(page_id, current_page, appendopts){
      var lnk, np = this.pc.numPages();
      page_id = page_id<0?0:(page_id<np?page_id:np-1); // Normalize page id to sane value
      appendopts = $.extend({text:page_id+1, classes:""}, appendopts||{});
      if(page_id == current_page){
        lnk = $("<span class='current'>" + appendopts.text + "</span>");
      }
      else
      {
        lnk = $("<a>" + appendopts.text + "</a>")
          .attr('href', this.opts.link_to.replace(/__id__/,page_id));
      }
      if(appendopts.classes){ lnk.addClass(appendopts.classes); }
      if(appendopts.rel){ lnk.attr('rel', appendopts.rel); }
      lnk.data('page_id', page_id);
      lnk.find("*").data('page_id', page_id);
      return lnk;
    },
    // Generate a range of numeric links
    appendRange:function(container, current_page, start, end, opts) {
      var i;
      for(i=start; i<end; i++) {
        this.createLink(i, current_page, opts).appendTo(container);
      }
    },
    getLinks:function(current_page, eventHandler) {
      var begin, end,
        interval = this.pc.getInterval(current_page),
        np = this.pc.numPages(),
        fragment = $("<div class='pagination'></div>");

      if(this.opts.page_size_switch) {

        var selectDom = '<label class="size">' + this.opts.switch_text + '</label>' + '<select>',
            sizes = this.opts.page_sizes || [10, 20, 30,40 ,50];

        sizes.forEach((function(_this) {
                  return function (i) {
                    selectDom += '<option value="' + i + '"' + (String(_this.opts.items_per_page) === String(i) ? 'selected' : '') + '>' + i + '</option>'
                  }
                })(this));

        fragment.append(selectDom += '</select>');
      }

      // Generate "Previous"-Link
      if(this.opts.prev_text && (current_page > 0 || this.opts.prev_show_always)){
        fragment.append(this.createLink(current_page-1, current_page, {text:this.opts.prev_text, classes:"prev",rel:"prev"}));
      }
      // Generate starting points
      if (interval.start > 0 && this.opts.num_edge_entries > 0)
      {
        end = Math.min(this.opts.num_edge_entries, interval.start);
        this.appendRange(fragment, current_page, 0, end, {classes:'sp'});
        if(this.opts.num_edge_entries < interval.start && this.opts.ellipse_text)
        {
          $("<span class='ellipse-span'>"+this.opts.ellipse_text+"</span>").appendTo(fragment);
        }
      }
      // Generate interval links
      this.appendRange(fragment, current_page, interval.start, interval.end);
      // Generate ending points
      if (interval.end < np && this.opts.num_edge_entries > 0)
      {
        if(np-this.opts.num_edge_entries > interval.end && this.opts.ellipse_text)
        {
          $("<span class='ellipse-span'>"+this.opts.ellipse_text+"</span>").appendTo(fragment);
        }
        begin = Math.max(np-this.opts.num_edge_entries, interval.end);
        this.appendRange(fragment, current_page, begin, np, {classes:'ep'});
      }
      // Generate "Next"-Link
      if(this.opts.next_text && (current_page < np-1 || this.opts.next_show_always)){
        fragment.append(this.createLink(current_page+1, current_page, {text:this.opts.next_text, classes:"next",rel:"next"}));
      }

      // 增加总共条目
      if( this.opts.total_text && this.opts.item_text) {
        fragment.prepend("<label class='total'>" + this.opts.total_text + this.maxentries + this.opts.item_text + "</label>")
      }

      // Generate "Go"-Link
      if(this.opts.jump_switch) {
        var noText = this.opts.no_text ? "<label class='no-text'>" + this.opts.no_text + "</label>" : "";
        var pageText = this.opts.page_text ? "<label class='page-text'>" + this.opts.page_text + "</label>" : "";
        fragment.append("<div class='handler'>" + noText + "<input type='text' name='go-page'>" + pageText + "<button class='btn' type='number'>" + this.opts.go_text + "</button></div>")
      }

      $('a', fragment).click(function(e){
        eventHandler(e)
        return false
      });

      if (this.opts.page_size_switch) {
        $('select', fragment).change(function(e){
          eventHandler({current_page: 0})
          return false
        });
      }

      if (this.opts.jump_switch){
        $('button', fragment).click(function(e){
          var current_page = Number($.trim($('input[name=go-page]', fragment).val()));
          if (!isNaN(current_page) && current_page > 0 && current_page <= np) {
            eventHandler({current_page: current_page - 1});
          }

          return false
        });
      }

      return fragment;
    }
  });

  // Extend jQuery
  $.fn.pagination = function(maxentries, opts){

    // Initialize options with default values
    opts = $.extend({
      page_size_switch:false,
      items_per_page:10,
      num_display_entries:11,
      current_page:0,
      num_edge_entries:0,
      link_to:"#",
      prev_text:"Prev",
      next_text:"Next",
      ellipse_text:"...",
      jump_switch: false,
      total_text: "Total",
      no_text: "No.",
      go_text: "Go",
      page_text: "Page",
      prev_show_always:true,
      next_show_always:true,
      renderer:"defaultRenderer",
      show_if_single_page:false,
      load_first_page:true,
      callback:function(){return false;}
    },opts||{});

    var containers = this,
      renderer, links, current_page;

    /**
     * This is the event handling function for the pagination links.
     * @param {int} page_id The new page number
     */
    function paginationClickHandler(evt){

      var links,
        new_current_page = $(evt.target).data('page_id') || evt.current_page || 0,
        continuePropagation = selectPage(new_current_page);

      if (!continuePropagation) {
        evt.stopPropagation();
      }

      return continuePropagation;
    }

    /**
     * This is a utility function for the internal event handlers.
     * It sets the new current page on the pagination container objects,
     * generates a new HTMl fragment for the pagination links and calls
     * the callback function.
     */
    function selectPage(new_current_page) {
      // update the link display of a all containers

      // 避免后续的重新绘制删除用户操作痕迹，先取到用户选择的每页展现条数
      var page_size = selectPageSize();

      // 这部分重新绘制逻辑其实可以去掉，
      // 和我们现在的实现--在回调中重新绘制分页器是重复的，
      // 为了兼容可能使用了自带绘制更新方法的情况，暂且保留
      containers.data('current_page', new_current_page);
      links = renderer.getLinks(new_current_page, paginationClickHandler);
      containers.empty();
      links.appendTo(containers);

      // call the callback and propagate the event if it does not return false
      var continuePropagation = opts.callback(new_current_page, page_size, containers);
      return continuePropagation;
    }

    //select pagesize setting
    function selectPageSize() {
      return links.find('select').val() || 20;
    }

    // -----------------------------------
    // Initialize containers
    // -----------------------------------
    current_page = parseInt(opts.current_page, 10);
    containers.data('current_page', current_page);
    // Create a sane value for maxentries and items_per_page
    maxentries = (!maxentries || maxentries < 0)?0:maxentries;
    opts.items_per_page = (!opts.items_per_page || opts.items_per_page < 0)?1:opts.items_per_page;

    if(!$.PaginationRenderers[opts.renderer])
    {
      throw new ReferenceError("Pagination renderer '" + opts.renderer + "' was not found in jQuery.PaginationRenderers object.");
    }
    renderer = new $.PaginationRenderers[opts.renderer](maxentries, opts);

    // Attach control events to the DOM elements
    var pc = new $.PaginationCalculator(maxentries, opts);
    var np = pc.numPages();
    containers.off('setPage').on('setPage', {numPages:np}, function(evt, page_id) {
        if(page_id >= 0 && page_id < evt.data.numPages) {
          selectPage(page_id); return false;
        }
    });
    containers.off('prevPage').on('prevPage', function(evt){
        var current_page = $(this).data('current_page');
        if (current_page > 0) {
          selectPage(current_page - 1);
        }
        return false;
    });
    containers.off('nextPage').on('nextPage', {numPages:np}, function(evt){
        var current_page = $(this).data('current_page');
        if(current_page < evt.data.numPages - 1) {
          selectPage(current_page + 1);
        }
        return false;
    });
    containers.off('currentPage').on('currentPage', function(){
        var current_page = $(this).data('current_page');
        selectPage(current_page);
        return false;
    });

    // When all initialisation is done, draw the links
    links = renderer.getLinks(current_page, paginationClickHandler);

    containers.empty();
    if((np > 1 || opts.show_if_single_page) && maxentries > 0) {
      links.appendTo(containers);
    }
    // call callback function
    if(opts.load_first_page) {
      opts.callback(current_page, containers);
    }
  }; // End of $.fn.pagination block

})(jQuery);
