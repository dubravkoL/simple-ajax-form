;(function(global, $) {

'use strict';

var htmlEscape = (function() {
    var entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    var regex = /[&<>"'\/]/g;

    return function(string) {
        return ('' + string).replace(regex, function(match) {
            return entities[match];
        });
    };
})();

function SimpleAjaxForm(el, action, options) {
    this.options = $.extend({
        reset: true,
        scrollToMessage: true,
        submit: null,
        success: null,
        failed: null,
        complete: null,
        successMessage: 'Submission Successful. Thank you.',
        successMessageClass: 'form-success alert alert-success',
        errorMessageClass: 'form-error alert alert-danger',
    }, options);

    // Make sure a jQuery instance was passed, and that we're dealing with
    // just one element.
    el = (el instanceof $) ? el.first() : $(el).first();

    this.$el = el;

    if (!action) {
        throw new Exception('SimpleAjaxForm: Invalid `action` argument supplied');
    }

    this.action = action;

    // Set the form to el, if it happens to be a <form>, or the first child <form>
    this.$form = el.is('form') ? el : el.find('form').first();

    // We'll inject
    this.$messages = el.find('.form-messages').not('noscript').first();

    this.registerEvent();
    this.scrollTopBuffer = 50;
}

SimpleAjaxForm.prototype.registerEvent = function() {
    this.$form.submit($.proxy(this.handleSubmit, this));
};

SimpleAjaxForm.prototype.handleSubmit = function(event) {
    event.preventDefault();
    this.$messages.empty();

    var requestOpts = {
        type: 'POST',
        url: this.action,
        dataType: 'json',
        success: $.proxy(this.handleSuccess, this),
        error: $.proxy(this.handleError, this),
        complete: $.proxy(this.handleComplete, this)
    };

    // Older browser won't support the FormData API, which it's required to do
    // AJAX file uploads
    if (global.FormData === undefined) {
        // We'll check if there are any file fields. If there are, we'll throw
        // an exception. Hopefully the dev will encounter it
        if (this.$form.find('input[type=file]').length) {
            throw new Exception(
                "The target form contains a file field, which requires the FormData" +
                "API, which this browser does not support."
            );
        }

        requestOpts.data = this.$form.serialize();
    }
    else {
        requestOpts.data = new FormData(this.$form[0]);

        requestOpts.processData = false;
        requestOpts.contentType = false;
    }

    $.ajax(requestOpts);

    if ($.isFunction(this.options.submit)) {
        this.options.submit.call(this, this);
    }

    this.$el.trigger('simpleajaxform.submit');
};

SimpleAjaxForm.prototype.handleSuccess = function(responseBody, status, error) {
    var eventArgs = [this].concat(Array.prototype.slice.call(arguments));

    this.$messages.empty();

    if ($.isFunction(this.options.successMessage)) {
        this.options.successMessage.apply(this, eventArgs);
    }
    else if (this.options.successMessage) {
        this.$messages.append('<p class="' + this.options.successMessageClass + '">' + this.options.successMessage + '</p>');
    }

    if ($.isFunction(this.options.success)) {
        this.options.success.apply(this, eventArgs);
    }

    if (this.options.reset) {
        this.$form[0].reset();
    }

    // Scroll to form messages
    if (this.options.scrollToMessage) {
        $('html, body').animate({scrollTop: this.$messages.offset().top - this.scrollTopBuffer});
    }

    this.$el.trigger('simpleajaxform.success', eventArgs);
};

SimpleAjaxForm.prototype.handleError = function(responseBody, status, error) {
    // Convert arguments to array
    var eventArgs = [this].concat(Array.prototype.slice.call(arguments));

    var response = responseBody.responseJSON || {success: false, messages: ['An error was encountered']};
    this.$messages.append(this.generateErrors(response.messages));

    if ($.isFunction(this.options.failed)) {
        this.options.failed.apply(this, eventArgs);
    }

    // Scroll to form messages
    if (this.options.scrollToMessage) {
        $('html, body').animate({scrollTop: this.$messages.offset().top - this.scrollTopBuffer});
    }

    this.$el.trigger('simpleajaxform.error', eventArgs);
};

SimpleAjaxForm.prototype.handleComplete = function(responseBody, status, error) {
    var eventArgs = [this].concat(Array.prototype.slice.call(arguments));

    if ($.isFunction(this.options.complete)) {
        this.options.complete.apply(this, eventArgs);
    }

    this.$el.trigger('simpleajaxform.complete', eventArgs);
};

SimpleAjaxForm.prototype.generateErrors = function(messages) {
    var html = '';

    for (var field in messages) {
        if (messages.hasOwnProperty(field)) {
            html += '<p class="' + this.options.errorMessageClass+ '">' + htmlEscape(messages[field]) + '</p>';
        }
    }

    return html;
};

global.SimpleAjaxForm = SimpleAjaxForm;

})(window, jQuery);
