(function($){

  /* Скрипт для ползунков (пришлось добавить в основной файл, чтобы можно было при смене положений ползунков обрабатывать изменение отображения списка квартир) */
  function jRangeFunc() {
    var jRange = function() {
      return this.init.apply(this, arguments);
    };
    jRange.prototype = {
      defaults: {
        onstatechange: function() {},
        ondragend: function() {},
        onbarclicked: function() {},
        isRange: false,
        showLabels: true,
        showScale: true,
        step: 1,
        format: '%s',
        theme: 'theme-green',
        width: 300,
        disable: false,
        snap: false
      },
      template: '<div class="slider-container">\
        <div class="back-bar">\
                  <div class="selected-bar"></div>\
                  <div class="pointer low" draggable="true"></div><div class="pointer-label low">123456</div>\
                  <div class="pointer high" draggable="true"></div><div class="pointer-label high">456789</div>\
                  <div class="clickable-dummy"></div>\
              </div>\
              <div class="scale"></div>\
      </div>',
      init: function(node, options) {
        this.options       = $.extend({}, this.defaults, options);
        this.inputNode     = $(node);
        this.options.value = this.inputNode.val() || (this.options.isRange ? this.options.from + ',' + this.options.from : '' + this.options.from);
        this.domNode       = $(this.template);
        this.domNode.addClass(this.options.theme);
        this.inputNode.after(this.domNode);
        this.domNode.on('change', this.onChange);
        this.pointers      = $('.pointer', this.domNode);
        this.lowPointer    = this.pointers.first();
        this.highPointer   = this.pointers.last();
        this.labels        = $('.pointer-label', this.domNode);
        this.lowLabel      = this.labels.first();
        this.highLabel     = this.labels.last();
        this.scale         = $('.scale', this.domNode);
        this.bar           = $('.selected-bar', this.domNode);
        this.clickableBar  = this.domNode.find('.clickable-dummy');
        this.interval      = this.options.to - this.options.from;
        this.render();
      },
      render: function() {
        // Check if inputNode is visible, and have some width, so that we can set slider width accordingly.
        if (this.inputNode.width() === 0 && !this.options.width) {
          console.log('jRange : no width found, returning');
          return;
        } else {
          this.options.width = this.options.width || this.inputNode.width();
          this.domNode.width(this.options.width);
          this.inputNode.hide();
        }

        if (this.isSingle()) {
          this.lowPointer.hide();
          this.lowLabel.hide();
        }
        if (!this.options.showLabels) {
          this.labels.hide();
        }
        this.attachEvents();
        if (this.options.showScale) {
          this.renderScale();
        }
        this.setValue(this.options.value);
      },
      isSingle: function() {
        if (typeof(this.options.value) === 'number') {
          return true;
        }
        return (this.options.value.indexOf(',') !== -1 || this.options.isRange) ?
          false : true;
      },
      attachEvents: function() {
        this.clickableBar.click($.proxy(this.barClicked, this));
        this.pointers.on('mousedown touchstart', $.proxy(this.onDragStart, this));
        this.pointers.bind('dragstart', function(event) {
          event.preventDefault();
        });
      },
      onDragStart: function(e) {
        if ( this.options.disable || (e.type === 'mousedown' && e.which !== 1)) {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        var pointer = $(e.target);
        this.pointers.removeClass('last-active');
        pointer.addClass('focused last-active');
        this[(pointer.hasClass('low') ? 'low' : 'high') + 'Label'].addClass('focused');
        $(document).on('mousemove.slider touchmove.slider', $.proxy(this.onDrag, this, pointer));
        $(document).on('mouseup.slider touchend.slider touchcancel.slider', $.proxy(this.onDragEnd, this));
      },
      onDrag: function(pointer, e) {
        e.stopPropagation();
        e.preventDefault();

        if (e.originalEvent.touches && e.originalEvent.touches.length) {
          e = e.originalEvent.touches[0];
        } else if (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
          e = e.originalEvent.changedTouches[0];
        }

        var position = e.clientX - this.domNode.offset().left;
        this.domNode.trigger('change', [this, pointer, position]);
      },
      onDragEnd: function(e) {
        this.pointers.removeClass('focused')
          .trigger('rangeslideend');
        this.labels.removeClass('focused');
        $(document).off('.slider');
        this.options.ondragend.call(this, this.options.value);
        createList();
      },
      barClicked: function(e) {
        if(this.options.disable) return;
        var x = e.pageX - this.clickableBar.offset().left;
        if (this.isSingle())
          this.setPosition(this.pointers.last(), x, true, true);
        else {
          var firstLeft       = Math.abs(parseFloat(this.pointers.first().css('left'), 10)),
              firstHalfWidth  = this.pointers.first().width() / 2,
              lastLeft        = Math.abs(parseFloat(this.pointers.last().css('left'), 10)),
              lastHalfWidth   = this.pointers.first().width() / 2,
              leftSide        = Math.abs(firstLeft - x + firstHalfWidth),
              rightSide       = Math.abs(lastLeft - x + lastHalfWidth),
              pointer;

          if(leftSide == rightSide) {
            pointer = x < firstLeft ? this.pointers.first() : this.pointers.last();
          } else {
            pointer = leftSide < rightSide ? this.pointers.first() : this.pointers.last();
          }
          this.setPosition(pointer, x, true, true);
        }
        this.options.onbarclicked.call(this, this.options.value);
      },
      onChange: function(e, self, pointer, position) {
        var min, max;
        min = 0;
        max = self.domNode.width();

        if (!self.isSingle()) {
          min = pointer.hasClass('high') ? parseFloat(self.lowPointer.css("left")) + (self.lowPointer.width() / 2) : 0;
          max = pointer.hasClass('low') ? parseFloat(self.highPointer.css("left")) + (self.highPointer.width() / 2) : self.domNode.width();
        }

        var value = Math.min(Math.max(position, min), max);
        self.setPosition(pointer, value, true);
      },
      setPosition: function(pointer, position, isPx, animate) {
        var leftPos, rightPos,
          lowPos = parseFloat(this.lowPointer.css("left")),
          highPos = parseFloat(this.highPointer.css("left")) || 0,
          circleWidth = this.highPointer.width() / 2;
        if (!isPx) {
          position = this.prcToPx(position);
        }
        if(this.options.snap){
          var expPos = this.correctPositionForSnap(position);
          if(expPos === -1){
            return;
          }else{
            position = expPos;
          }
        }
        if (pointer[0] === this.highPointer[0]) {
          highPos = Math.round(position - circleWidth);
        } else {
          lowPos = Math.round(position - circleWidth);
        }
        pointer[animate ? 'animate' : 'css']({
          'left': Math.round(position - circleWidth)
        });
        if (this.isSingle()) {
          leftPos = 0;
        } else {
          leftPos = lowPos + circleWidth;
          rightPos = highPos + circleWidth;
        }
        var w = Math.round(highPos + circleWidth - leftPos);
        this.bar[animate ? 'animate' : 'css']({
          'width': Math.abs(w),
          'left': (w>0) ? leftPos : leftPos + w
        });
        this.showPointerValue(pointer, position, animate);
        this.isReadonly();
      },
      correctPositionForSnap: function(position){
        var currentValue = this.positionToValue(position) - this.options.from;
        var diff = this.options.width / (this.interval / this.options.step),
          expectedPosition = (currentValue / this.options.step) * diff;
        if( position <= expectedPosition + diff / 2 && position >= expectedPosition - diff / 2){
          return expectedPosition;
        }else{
          return -1;
        }
      },
      // will be called from outside
      setValue: function(value) {
        var values = value.toString().split(',');
        values[0] = Math.min(Math.max(values[0], this.options.from), this.options.to) + '';
        if (values.length > 1){
          values[1] = Math.min(Math.max(values[1], this.options.from), this.options.to) + '';
        }
        this.options.value = value;
        var prc = this.valuesToPrc(values.length === 2 ? values : [0, values[0]]);
        if (this.isSingle()) {
          this.setPosition(this.highPointer, prc[1]);
        } else {
          this.setPosition(this.lowPointer, prc[0]);
          this.setPosition(this.highPointer, prc[1]);
        }
      },
      renderScale: function() {
        var s = this.options.scale || [this.options.from, this.options.to];
        var prc = Math.round((100 / (s.length - 1)) * 10) / 10;
        var str = '';
        for (var i = 0; i < s.length; i++) {
          str += '<span style="left: ' + i * prc + '%">' + (s[i] != '|' ? '<ins>' + parseFloat(s[i]).toLocaleString('ru') + '</ins>' : '') + '</span>';
        }
        this.scale.html(str);

        $('ins', this.scale).each(function() {
          $(this).css({
            marginLeft: -$(this).outerWidth() / 2
          });
        });
      },
      getBarWidth: function() {
        var values = this.options.value.split(',');
        if (values.length > 1) {
          return parseFloat(values[1]) - parseFloat(values[0]);
        } else {
          return parseFloat(values[0]);
        }
      },
      showPointerValue: function(pointer, position, animate) {
        var label = $('.pointer-label', this.domNode)[pointer.hasClass('low') ? 'first' : 'last']();
        var text;
        var value = this.positionToValue(position);
        // Is it higer or lower than it should be?

        if ($.isFunction(this.options.format)) {
          var type = this.isSingle() ? undefined : (pointer.hasClass('low') ? 'low' : 'high');
          text = this.options.format(value, type);
        } else {
          text = this.options.format.replace('%s', value.toLocaleString('ru'));
        }

        var width = label.html(text).width(),
          left = position - width / 2;
        left = Math.min(Math.max(left, 0), this.options.width - width);
        label[animate ? 'animate' : 'css']({
          left: left
        });
        this.setInputValue(pointer, value);
      },
      valuesToPrc: function(values) {
        var lowPrc = ((parseFloat(values[0]) - parseFloat(this.options.from)) * 100 / this.interval),
          highPrc = ((parseFloat(values[1]) - parseFloat(this.options.from)) * 100 / this.interval);
        return [lowPrc, highPrc];
      },
      prcToPx: function(prc) {
        return (this.domNode.width() * prc) / 100;
      },
      isDecimal: function() {
        return ((this.options.value + this.options.from + this.options.to).indexOf(".")===-1) ? false : true;
      },
      positionToValue: function(pos) {
        var value = (pos / this.domNode.width()) * this.interval;
        value = parseFloat(value, 10) + parseFloat(this.options.from, 10);
        if (this.isDecimal()) {
          var final = Math.round(Math.round(value / this.options.step) * this.options.step *100)/100;
          if (final!==0.0) {
            final = '' + final;
            if (final.indexOf(".")===-1) {
              final = final + ".";
            }
            while (final.length - final.indexOf('.')<3) {
              final = final + "0";
            }
          } else {
            final = "0.00";
          }
          return final;
        } else {
          return Math.round(value / this.options.step) * this.options.step;
        }
      },
      setInputValue: function(pointer, v) {
        // if(!isChanged) return;
        if (this.isSingle()) {
          this.options.value = v.toString();
        } else {
          var values = this.options.value.split(',');
          if (pointer.hasClass('low')) {
            this.options.value = v + ',' + values[1];
          } else {
            this.options.value = values[0] + ',' + v;
          }
        }
        if (this.inputNode.val() !== this.options.value) {
          this.inputNode.val(this.options.value)
            .trigger('change');
          this.options.onstatechange.call(this, this.options.value);
        }
      },
      getValue: function() {
        return this.options.value;
      },
      getOptions: function() {
        return this.options;
      },
      getRange: function() {
        return this.options.from + "," + this.options.to;
      },
      isReadonly: function(){
        this.domNode.toggleClass('slider-readonly', this.options.disable);
      },
      disable: function(){
        this.options.disable = true;
        this.isReadonly();
      },
      enable: function(){
        this.options.disable = false;
        this.isReadonly();
      },
      toggleDisable: function(){
        this.options.disable = !this.options.disable;
        this.isReadonly();
      },
      updateRange: function(range, value) {
        var values = range.toString().split(',');
        this.interval = parseInt(values[1]) - parseInt(values[0]);
        if(value){
          this.setValue(value);
        }else{
          this.setValue(this.getValue());
        }
      }
    };

    var pluginName = 'jRange';
    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function(option) {
      var args = arguments,
        result;

      this.each(function() {
        var $this = $(this),
          data = $.data(this, 'plugin_' + pluginName),
          options = typeof option === 'object' && option;
        if (!data) {
          $this.data('plugin_' + pluginName, (data = new jRange(this, options)));
          $(window).resize(function() {
            data.setValue(data.getValue());
          }); // Update slider position when window is resized to keep it in sync with scale
        }
        // if first argument is a string, call silimarly named function
        // this gives flexibility to call functions of the plugin e.g.
        //   - $('.dial').plugin('destroy');
        //   - $('.dial').plugin('render', $('.new-child'));
        if (typeof option === 'string') {
          result = data[option].apply(data, Array.prototype.slice.call(args, 1));
        }
      });

      // To enable plugin returns values
      return result || this;
    };
  };
  jRangeFunc();
  /* Конец плагина jRange */



  let sortBtns = document.querySelectorAll('.scr1__sort');
  let _count = 5;
  let _toTop = document.querySelector('.to-top');
  let _loadMoreBtn = document.querySelector('.js-load-more');
  let _resetBtn = document.querySelector('.js-btn-reset');
  let _form = document.querySelector('.scr1__filters form');
  let _rangePrice = document.querySelector('.scr1__range-item--price');
  let _priceMin = _rangePrice.getAttribute('data-min');
  let _priceMax = _rangePrice.getAttribute('data-max');
  let _rangeSquare = document.querySelector('.scr1__range-item--square');
  let _squareMin = _rangeSquare.getAttribute('data-min');
  let _squareMax = _rangeSquare.getAttribute('data-max');
  let _roomsCount = document.querySelectorAll('.scr1__filters-rooms-item input');
  let _pageTitle = document.querySelector('.page-title');
  let _pageWr = document.querySelector('.scr1 .wr');
  let _rangeWidth = 319;

  if (window.matchMedia("(max-width: 991px)").matches) {
    _rangeWidth = 258;
  } else if (window.matchMedia("(max-width: 1170px)").matches) {
    _rangeWidth = 278;
  }

  if (window.matchMedia("(max-width: 767px)").matches) {
    let theFirstChild = _pageWr.firstChild;
    _pageWr.insertBefore(_pageTitle, theFirstChild);
  }

  /* Нужно для IE и некоторых других браузеров, чтобы понимал svg спрайты во внешних файлах */
  svg4everybody();


  // Отрисовки списка квартир
  function createList() {
    let _activeSort = document.querySelector('.scr1__sort--active');
    let sortfield = _activeSort.getAttribute('data-sort');
    let sorttype = _activeSort.classList.contains('scr1__sort--asc') ? 'asc' : 'desc';
    let _priceSortMin = _rangePrice.value.split(',')[0];
    let _priceSortMax = _rangePrice.value.split(',')[1];
    let _squareSortMin = _rangeSquare.value.split(',')[0];
    let _squareSortMax = _rangeSquare.value.split(',')[1];
    let _roomsArr = [];
    _roomsCount.forEach(function(item, i, arr) {
      if ( item.checked ) {
        _roomsArr.push(+item.value);
      }
    });

    $.ajax({
      type: "Get",
      url: "apartments.json",
      dataType: 'json',
      success: function(data){
        document.querySelector('.scr1__content').innerHTML = '';

        let _sort;

        if ( sortfield == 'price' ) {
          if ( sorttype == 'asc' ) {
            _sort = (a, b) => a.price > b.price ? 1 : -1;
          } else {
            _sort = (a, b) => a.price < b.price ? 1 : -1;
          }
        } else if ( sortfield == 'square' ) {
          if ( sorttype == 'asc' ) {
            _sort = (a, b) => a.square > b.square ? 1 : -1;
          } else {
            _sort = (a, b) => a.square < b.square ? 1 : -1;
          }
        } else {
          if ( sorttype == 'asc' ) {
            _sort = (a, b) => a.stage > b.stage ? 1 : -1;
          } else {
            _sort = (a, b) => a.stage < b.stage ? 1 : -1;
          }
        }

        data = data.filter(function(item) {
          return (item.price >= _priceSortMin && item.price <= _priceSortMax);
        });
        data = data.filter(function(item) {
          return (item.square >= _squareSortMin && item.square <= _squareSortMax);
        });
        data = data.filter(function(item) {
          let _rooms = false;
          _roomsArr;
          if(_roomsArr.indexOf(item.rooms) != -1) {
            _rooms = true;
          }
          return _rooms;
        });
        data = data.sort(_sort).slice(0,_count);

        data.forEach(function(item, i, arr) {
          let _itemPrice = item.price.toLocaleString('ru');
          let _itemSquare = item.square.toString().replace('.',',');
          let _newItem = document.createElement('div');

          _newItem.className = "scr1__row scr1__row--content";

          if (window.matchMedia("(max-width: 1170px)").matches) {
            _newItem.innerHTML = '<div class="scr1__wrap">'
            +'<div class="scr1__col"><a class="scr1__apartment-title" href="#">' + item.rooms + '-комнатная №' + item.num + '</a></div>'
            +'<div class="scr1__col-df">'
            +'<div class="scr1__col"><span>' + _itemSquare + '</span></div>'
            +'<div class="scr1__col"><span>' + item.stage + '<i> из 17</i></span></div>'
            +'<div class="scr1__col"><span>' + _itemPrice + '</span></div>'
            +'</div></div>'
            +'<div class="scr1__col"><a class="scr1__plan" data-fancybox="svg" data-width="500" data-height="500" href="' + item.apt_img_url + '" tabindex="0"><img src="' + item.apt_img_url + '" alt="Планировка"></a></div>';
          } else {
            _newItem.innerHTML = '<div class="scr1__col"><a class="scr1__plan" data-fancybox="svg" data-width="500" data-height="500" href="' + item.apt_img_url + '" tabindex="0"><img src="' + item.apt_img_url + '" alt="Планировка"></a></div>'
            +'<div class="scr1__col"><a class="scr1__apartment-title" href="#">' + item.rooms + '-комнатная №' + item.num + '</a></div>'
            +'<div class="scr1__col"><span>' + _itemSquare + '</span></div>'
            +'<div class="scr1__col"><span>' + item.stage + '<i> из 17</i></span></div>'
            +'<div class="scr1__col"><span>' + _itemPrice + '</span></div>';
          }

          document.querySelector('.scr1__content').append(_newItem);
        });
      },
    });
  }

  createList();

  /* Инициализация ползунков */
  function rangePrice() {
    $(_rangePrice).jRange({
      from: _priceMin,
      to: _priceMax,
      width: _rangeWidth,
      step: 100000,
      format: '%s',
      showLabels: true,
      isRange : true,
    });
  };

  rangePrice();

  function rangeSquare() {
    $(_rangeSquare).jRange({
      from: _squareMin,
      to: _squareMax,
      width: _rangeWidth,
      step: 1,
      format: '%s',
      showLabels: true,
      isRange : true,
    });
  };

  rangeSquare();


  /* Код для кнопок сортировки */
  sortBtns.forEach(function(item, i, arr) {
    item.addEventListener("click", function() {

      sortBtns.forEach(function(item) {
        if (item !== this) {
          item.classList.remove('scr1__sort--active');
          item.classList.remove('scr1__sort--asc');
          item.classList.remove('scr1__sort--desc');
        }
      },this);

      item.classList.add('scr1__sort--active');
      if (item.classList.contains('scr1__sort--asc')) {
        item.classList.add('scr1__sort--desc');
        item.classList.remove('scr1__sort--asc');
      } else {
        item.classList.add('scr1__sort--asc');
        item.classList.remove('scr1__sort--desc')
      }

      createList();

    });
  });


  /* Кнопка "загрузить ещё" */
  _loadMoreBtn.addEventListener("click", function() {
    _count += +this.getAttribute('data-count');
    createList();
    let scrolled = this.getBoundingClientRect().top;
    window.scrollBy({top: scrolled});

    $('html, body').animate({scrollTop: '' + scrolled + 'px'},10);
  });


  /* Кнопка "вверх" */
  function trackScroll() {
    let scrolled = window.pageYOffset;
    let coords = document.documentElement.clientHeight / 5;

    if (scrolled > coords) {
      _toTop.classList.add('fixed');
    }
    if (scrolled < coords) {
      _toTop.classList.remove('fixed');
    }
  }
  function backToTop() {
    document.querySelector('html').classList.add('smooth');
    window.scrollTo(pageYOffset, 0);
    document.querySelector('html').classList.remove('smooth');
  }
  window.addEventListener('scroll', trackScroll);
  _toTop.addEventListener('click', backToTop);


  /* Кнопка "сбросить параметры" */
  _resetBtn.addEventListener('click', function() {
    _form.reset();
    $('.scr1__range-item--price').jRange('setValue', '' + _priceMin + ',' + _priceMax + '');
    $('.scr1__range-item--square').jRange('setValue', '' + _squareMin + ',' + _squareMax + '');
    createList();
  });



  /* Изменение списка по нажатию на шкалу с ползунками */
  let _rangePointerContainer = document.querySelectorAll('.back-bar');
  _rangePointerContainer.forEach(function(item, i, arr) {
    item.addEventListener('click', function() {
      createList();
    });
  });


  /* Изменение списка при выборе количества комнат */
  _roomsCount.forEach(function(item, i, arr) {
    item.addEventListener('change', function() {
      createList();
    });
  });


  /* Изменение списка при изменении размеров окна */
  window.addEventListener('resize', function(event) {
    createList();
  }, true);

})(jQuery);
