(function($) {

    /*************************************************
     //                                              //
     //              FRONT END VIEWS					//
     //                                              //
     *************************************************/
// View: App level



    JobEngine.Views.App = Backbone.View.extend({
        el: 'body',
        header: {},
        templates: {},
        currentUser: {},
        auth: {},
        initialize: function() {

// init default settings for validator plugin
            $.validator.setDefaults({
// prevent the form to submit automatically by this plugin
// so we need to apply handler manually
                onsubmit: false,
                onfocusout: function(element, event) {
                    if (!this.checkable(element) && element.tagName.toLowerCase() === 'textarea') {
                        this.element(element);
                    }
                    else if (!this.checkable(element) && (element.name in this.submitted || !this.optional(element))) {
                        this.element(element);
                    }
                },
                validClass: "valid", // the classname for a valid element container
                errorClass: "message", // the classname for the error message for any invalid element
                errorElement: 'div', // the tagname for the error message append to an invalid element container

                // append the error message to the element container
                errorPlacement: function(error, element) {
                    $(element).closest('div').append(error);
                },
                // error is detected, addClass 'error' to the container, remove validClass, add custom icon to the element
                highlight: function(element, errorClass, validClass) {
                    var $container = $(element).closest('div');
                    if (!$container.hasClass('error')) {
                        $container.addClass('error').removeClass(validClass)
                                .append('<span class="icon" data-icon="!"></span>');
                    }
                },
                // remove error when the element is valid, remove class error & add validClass to the container
                // remove the error message & the custom error icon in the element
                unhighlight: function(element, errorClass, validClass) {
                    var $container = $(element).closest('div');
                    if ($container.hasClass('error')) {
                        $container.removeClass('error').addClass(validClass);
                    }
                    $container.find('div.message').remove()
                            .end()
                            .find('span.icon').remove();
                }
            });
            this.header = new JobEngine.Views.Header();
            this.auth = new JobEngine.Models.Auth();
            // init current user model
            var current_user_data = this.$('#current_user_data').html();
            if (!!current_user_data) {
                current_user_data = JSON.parse(current_user_data);
            }
            this.currentUser = new JobEngine.Models.Company(current_user_data);
            this.templates.notification = new _.template(
                    '<div class="notification autohide <%= type %>-bg">' +
                    '<div class="main-center">' +
                    '<%= msg %>' +
                    '</div>' +
                    '</div>'
                    );
            // event handler to show notification on top of the page
            pubsub.on('je:notification', this.showNotice, this);
            // event handler for when receiving response from server after requesting login/register
            pubsub.on('je:response:auth', this.handleAuth, this);
            // event handler for when receiving response from server after requesting new password
            pubsub.on('je:response:request_reset_password', this.handleRequestResetPassword, this);
            // event handler for when receiving response from server after reseting password
            pubsub.on('je:response:reset_password', this.handleResetPassword, this);
            // event handler for when receiving response from server after requesting logout
            pubsub.on('je:response:logout', this.handleLogout, this);
            // render button in header
            this.currentUser.on('change:id', this.header.updateAuthButtons, this.header);
        },
        // event handler: for custom event: "custom:notification"
        // show the notice on top of the page
        showNotice: function(params) {

// remove existing notification
            jQuery('div.notification').remove();
            var notification = jQuery(this.templates.notification({msg: params.msg, type: params.notice_type}));
            if (jQuery('#wpadminbar').length !== 0) {
                notification.addClass('having-adminbar');
            }

            notification.hide().prependTo('body')
                    .fadeIn('fast')
                    .delay(1000)
                    .fadeOut(3000, function() {
                jQuery(this).remove();
            });
        },
        handleAuth: function(resp, status, jqXHR) {
            var notice_type;
            // check if authentication is successful or not
            if (resp.status) {
                pubsub.trigger('je:notification', {
                    msg: resp.msg,
                    notice_type: 'success'
                });
                var data = resp.data;
                if (et_globals.is_single_job) {
                    if (data.is_admin) {
                        window.location.reload();
                    }
                } else

                // if this is not job posting page, reload
                if (et_globals.page_template !== 'page-jobseeker-signup.php' &&
                        et_globals.page_template !== 'page-post-a-job.php' &&
                        et_globals.page_template !== 'page-upgrade-account.php'
                        ) {
                    window.location.reload();
                }

                if (et_globals.is_single_job)
                    window.location.reload();
                this.currentUser.set(resp.data);
                if (typeof data.redirect_url !== 'undefined') {
                    window.location.href = data.redirect_url;
                }

            }
            else {
                pubsub.trigger('je:notification', {
                    msg: resp.msg,
                    notice_type: 'error'
                });
            }
        },
        handleRequestResetPassword: function(data, status, jqXHR) {
            pubsub.trigger('je:notification', {
                notice_type: data.success ? 'success' : 'error',
                msg: data.msg
            });
        },
        handleResetPassword: function(data, status, jqXHR) {
            pubsub.trigger('je:notification', {
                notice_type: data.success ? 'success' : 'error',
                msg: data.msg
            });
        },
        handleLogout: function(data, status, jqXHR) {
// clear the currentUser model
// this also trigger the "change" event of this model
            this.currentUser.clear();
            // trigger notification on the top
            pubsub.trigger('je:notification', {
                msg: data.msg,
                notice_type: 'success'
            });
            if (et_globals.page_template !== 'page-post-a-job.php' &&
                    et_globals.page_template !== 'page-upgrade-account.php'
                    ) {

                window.location.href = et_globals.homeURL;
            }
        }
    });
// View: Header
    JobEngine.Views.Header = Backbone.View.extend({
        el: 'header',
        modal_login: {},
        modal_register: {},
        modal_forgot_pass: {},
        templates: {
            'login': '<li><a id="requestLogin" class="login-modal header-btn bg-btn-header" href="#login"><span class="icon" data-icon="U"></span></a></li>',
            'auth': _.template('<li><a href="<%= profile_url %>" class="bg-btn-header header-btn"><span class="icon" data-icon="U"></span></a></li>' +
                    '<li><a href="' + et_globals.logoutURL + '" id="requestLogout" class="bg-btn-header header-btn"><span class="icon" data-icon="Q"></span></a></li>')
        },
        events: {
            'click a#requestLogout': 'doLogout',
            'click a#requestLogin': 'doLogin',
            'click a#requestRegister': 'doRegister'
        },
        initialize: function() {
            if (!this.modal_login || !(this.modal_login instanceof JobEngine.Views.Modal_Login)) {
                this.modal_login = new JobEngine.Views.Modal_Login();
            }
            if (!this.modal_register || !(this.modal_register instanceof JobEngine.Views.Modal_Register)) {
                this.modal_register = new JobEngine.Views.Modal_Register();
            }
            if (!this.modal_forgot_pass || !(this.modal_forgot_pass instanceof JobEngine.Views.Modal_Forgot_Pass)) {
                this.modal_forgot_pass = new JobEngine.Views.Modal_Forgot_Pass();
            }
        },
        updateAuthButtons: function() {
            if (!JobEngine.app.currentUser.isNew()) {
                this.$('div.account ul').html(this.templates.auth(JobEngine.app.currentUser.attributes));
            }
            else {
                this.$('div.account ul').html(this.templates.login);
            }
            pubsub.trigger('afterUserChange', JobEngine.app.currentUser.isNew());
        },
        doLogout: function(e) {
            e.preventDefault();
            pubsub.trigger('je:request:logout');
            JobEngine.app.auth.doLogout();
        },
        doLogin: function(e) {
            console.log('trigger request auth');
            e.preventDefault();
            pubsub.trigger('je:request:auth');
        },
        doRegister: function(e) {
            e.preventDefault();
            pubsub.trigger('je:request:register');
        }

    });
// Job List View
    JobEngine.Views.JobListView = Backbone.View.extend({
        tagName: 'div',
        className: 'jobs_container',
        initialize: function() {

            var that = this;
            _.bindAll(this);
            this.listConfig = _.extend({disableAction: false}, {disableAction: this.options.disableAction});
            this.listView = []; // this array contain all the item views
            if (!!this.collection && !!this.el) {
                this.collection.each(function(model, index, coll) {
                    var el = that.$('li:eq(' + index + ')');
                    if (el.length !== 0) {
// use the index of the collection to generate the matching item view
                        that.listView[index] = new JobEngine.Views.JobListItemView({el: el, model: model, listConfig: that.listConfig});
                    }
                });
            }
            if (this.collection !== undefined) {
                this.collection.on('add', this.addJob, this);
                this.collection.on('unshift', this.addJob, this);
                this.collection.on('remove', this.removeJob, this);
                this.collection.on('reset', this.render, this);
                // handle filter & next page event
                this.collection.bind('nextPageBeforeSend', this.nextPageBeforeSend);
                this.collection.bind('nextPageSuccess', this.nextPageSuccess);
                this.collection.bind('filterBeforeSend', this.filterBeforeSend);
                this.collection.bind('filterSuccess', this.filterSuccess);
            }

            this.blockUi = new JobEngine.Views.BlockUi({
                image: et_globals.imgURL + '/loading_big.gif',
                opacity: 0.7,
                background_color: $('body').css('background-color')
            });
        },
        // when a job is added to the collection, also create a view
        addJob: function(job, col, options) {

            var itemView = new JobEngine.Views.JobListItemView({model: job, listConfig: this.listConfig}),
            $itemEl = itemView.render().$el.hide(),
                    $existingItems = this.$('li.job-item'),
                    index = (options && 'index' in options) ? options.index : $existingItems.length,
                    position = $existingItems.eq(index);
            // insert the view at the correct position, same index in collection
            if (this.listView.length === 0 || position.length === 0) {
                $itemEl.appendTo(this.$el.find('ul')).fadeIn('slow');
            }
            else {
                $itemEl.insertBefore(position).fadeIn('slow');
            }

// add to the View array correctly
            this.listView.splice(index, 0, itemView);
        },
        // after a job is removed from the collection, remove its view
        removeJob: function(job, col, options) {

// remove the job item view from the array listView
            var itemView = this.listView.splice(options.index, 1);
            if (itemView.length > 0) {
                itemView[0].$el.fadeOut('slow', function() {
                    itemView[0].remove().undelegateEvents();
                    // after hiding the removed job, publish this event to add the job to the correct collection
                    pubsub.trigger('je:job:afterRemoveJobView', job);
                });
            }
        },
        render: function() {
            var $list = this.$el.find('ul'),
                    $ele = $list.children(),
                    view = this,
                    i = $ele.length;
            // hide the button load more first
            view.$('div.button-more').hide();
            if (this.collection.length > 0) {
                $list.fadeOut('fast');
                // empty the list first
                _.each(this.listView, function(item) {
                    item.remove().undelegateEvents();
                });
                if (i !== 0) {
                    $ele.fadeOut('normal', function() {
                        jQuery(this).remove();
                        i--;
                        if (i === 0) {

// add each view of each item into the list
                            view.collection.each(view.addJob);
                        }
                    });
                }
                else {
                    this.collection.each(this.addJob);
                }

// set correct title of the job list
                this.$('.main-title').html(this.collection.list_title);
                // display list slowly
                $list.fadeIn('slow', function() {
// remove loadmore if all jobs are fetched
                    if (view.collection.paginateData.paged >= view.collection.paginateData.total_pages) {
                        view.$('div.button-more').hide();
                    }
                    else {
                        view.$('div.button-more').fadeIn('slow');
                    }
                });
            } else {
                $list.html('').append('<li class="no-job-found">' + et_globals.no_job_found + '</li>');
                view.$('div.button-more').hide();
            }

            return this;
        },
        nextPageBeforeSend: function() {
            this.loadingBtn = new JobEngine.Views.LoadingButton({el: this.$('.button-more button')});
            this.loadingBtn.loading();
        },
        nextPageSuccess: function() {
            this.loadingBtn.finish();
        },
        filterBeforeSend: function() {
            this.blockUi.block(this.$el.find('ul'));
        },
        filterSuccess: function() {
            this.blockUi.unblock();
        }
    });
    // Job List Item View
    JobEngine.Views.JobListItemView = Backbone.View.extend({
        tagName: 'div', //li
        className: 'div-job-item', //job-item-filter
        events: {
            'click .actions .action-featured': 'toggleFeature',
            'click .actions .action-approve': 'approveJob',
            'click .actions .action-reject': 'rejectJob',
            'click .actions .action-archive': 'archiveJob',
            'click .actions .action-edit': 'editJob'
        },
        isProcessing: false,
        initialize: function() {
            if (this.model) {
                pubsub.on('je:job:onAuthorChanged:' + this.model.get('author_id'), this.renderAuthor, this);
                this.model.on('change', this.render, this);
            }
            this.blockUi = new JobEngine.Views.BlockUi();
        },
        // render the list item
        render: function() {
            var that = this,
                    attrs = this.model.toJSON(),
                    template_id = this.model.get('template_id') ? this.model.get('template_id') : 'no';
            // the template is generated at footer to be properly translated
            //this.template	= jQuery('#job_list_item');
            if (jQuery('#template_' + template_id).length > 0) {
                this.template = jQuery('#template_' + template_id);
            } else {
                this.template = jQuery('#latest_jobs_data');
            }

            if (this.template.length > 0) {
                this.template = _.template(this.template.html());
            }

            if (this.model.author.has('user_logo') && this.model.author.has('post_url') && this.model.author.has('display_name')) {
                this.model.updateJobAuthor();
                var pack = ''; 
                var dataSort = 0;
                var company_logo = et_globals.imgURL + '/default_logo.jpg';
                if (this.model.get('datasort') == 1) {
                    dataSort = 1;
                }
                pack = this.model.get('pack');

                //verband logo and zertifikat logo
                if(this.model.get('verband_logo') != undefined)
                    verband_logo = this.model.get('verband_logo');
                else
                    verband_logo = '';

                if(this.model.get('zertifikat_logo') != undefined)
                    zertifikat_logo = this.model.get('zertifikat_logo');
                else
                    zertifikat_logo = '';

                var company_zertifikat = '';
                var company_label = '';
                if (this.model.get('company_zertifikat') != undefined)
                    company_zertifikat = '<img src="' + this.model.get('company_zertifikat') + '" style="width: 40px; height:40px;" alt=""/>';
                if (this.model.get('company_label') != undefined)
                    company_label = '<img src="' + this.model.get('company_label') + '" style="width: 40px; height:40px;" alt=""/>';
                console.log(this.model.toJSON());
                if (this.model.get('author_data')['user_logo']['attach_id'])
                    company_logo = (this.model.get('author_data')['user_logo']['thumbnail'][0] != "") ? this.model.get('author_data')['user_logo']['thumbnail'][0] : this.model.get('author_data')['user_logo']['small_thumb'][0];
                var templ = '';
                var featured = '';
                if (this.model.get('featured') !== "0") {
                    featured = 'featured';
                }
                var job_type_name = '';
                var job_type_url = '';
                var job_type_color = '';
                if (this.model.get('job_types').length > 0) {
                    job_type_name = this.model.get('job_types')[0]['name'];
                    job_type_url = this.model.get('job_types')[0]['url'];
                    job_type_color = this.model.get('job_types')[0]['color'];
                }
                var category_name = '';
                if (this.model.get('categories').length > 0) {
                    var categories_name = [];
                    for (i = 0; i < this.model.get('categories').length; i++) {
                        categories_name.push(
                                '<a href="' + this.model.get('categories')[i]['url'] + '"> ' + this.model.get('categories')[i]['name'] + ' </a>'

                                );
                    }
                    category_name = categories_name.join(', ');
                }

                templ = '<div class="box-job ' + featured + '" data-sort="' + dataSort + '"><li class="job-item clearfix clear ' + featured + '"><div class="row-fluid"> <div class="span2 logo">' +
                        '<div class="thumb" style="vertical-align: middle;"> <a id="job_author_thumb" data="1" href="' + this.model.author.get('post_url') + '" title="' + this.model.get('title') + '" class="thumb">' +
                        '<img src="' + company_logo + '" id="company_logo_thumb" data="0">' +
                        '</a> </div> </div> <div class="span10 job-info"> <div class="row-fluid">' +
                        '<a class="title-link title" href="' + this.model.get('permalink') + '" title="' + this.model.get('title') + '">' +
                        '<h2>' + this.model.get('title') + '</h2> </a> </div> <div class="row-fluid"> <div class="span4 desc"> <div class="cat company_name">' +
                        '<a data="1" href="' + this.model.get('author_url') + '" title="Von praktischArzt veröffentlichte Stellen anzeigen">' +
                        this.model.get('author') + '</a> </div> <div> <span class="icon location" data-icon="@"></span><span class="nline">' + this.model.get('full_location') + '</span>' +
                        '</div> </div> <div class="span8"> <div class="span5 desc"> <div> <span class="nline">' + category_name + '</span>' +
                        '</div> <div class="company_label">' + zertifikat_logo + '' + verband_logo + '</span></div> </div> <div class="span7"> <div class="span6"> <div class="desc">  ' +
                        '<div class="job-type color-' + job_type_color + '"> <span class="flag"></span>' +
                        '<a href="' + job_type_url + '" title="Alle in Assistenzarzt veröffentlichten Stellen ansehen">' +
                        job_type_name + '</a></div> <div class=""> <span class="icon" data-icon="t"></span><span class="job-date">' + this.model.get('date_de') + '</span>' +
                        '</div> <div class="is_klinik"> <span class="icon" data-icon="H"></span><span>' + this.model.get('clinici') + '</span>                                    </div><!-- is klinik -->' +
                        '</div> </div> <div class="span6"> <div class="btn-select f-right">' +
                        '<a class="title-link" href="' + job_type_url + '" title="' + this.model.get('title') + '">' +
                        '<button class="bg-btn-hyperlink border-radius">   Stelle ansehen   </button>' +
                        '</a></div></div> </div></div></div></div> </div> <br clas="clear"></li></div>';

                this.$el.addClass('job-item').html(templ);
            }
            else {
                this.model.author.fetch({
                    silent: true,
                    success: function(author, res) {

                        that.model.set('author_data', {
                            'id': author.get('id'),
                            'user_url': author.get('user_url'),
                            'display_name': author.get('display_name'),
                            'user_logo': author.get('user_logo'),
                            'post_url': author.get('post_url'),
                            'apply_method': author.get('apply_method'),
                            'apply_email': author.get('apply_email'),
                            'applicant_detail': author.get('applicant_detail')

                        }, {silent: true});
                        that.$el.addClass('job-item').html(that.template($.extend({}, that.model.toJSON(), that.options.listConfig)));
                    }
                });
            }
//console.log(this.model);
            return this;
        },
        blockItem: function() {
            this.blockUi.block(this.$el);
        },
        unblockItem: function() {
            this.blockUi.unblock();
        },
        renderAuthor: function(author_data) {
            var $target = this.$('.thumb').empty(),
                    $companyname = this.$('.content .company_name'),
                    thumb = ('small_thumb' in author_data['user_logo']) ? author_data['user_logo']['small_thumb'][0] : author_data['user_logo']['thumbnail'][0],
                    link = "<a data='" + author_data['id'] + "' href='" + author_data['post_url'] + "' " +
                    "id='job_author_name' class='thumb' title='" + author_data['display_name'] + "'>";
            $target.html(link + "<img src='" + thumb + "' alt='" + author_data['display_name'] + "'/></a>");
            $companyname.html(link + author_data['display_name'] + '</a>');
        },
        // event handler: toggle the feature button
        toggleFeature: function(event) {
            var view = this;
            event.preventDefault();
            this.model.save({}, {
                data: {
                    id: this.model.id
                },
                method: 'toggleFeature',
                beforeSend: function() {
                    view.blockItem();
                },
                success: function(model, resp) {
                    view.unblockItem();
                    if (resp.success) {
                        pubsub.trigger('je:job:afterToggleFeature', model, resp);
                        pubsub.trigger('je:notification', {
                            msg: resp.msg,
                            notice_type: 'success'
                        });
                    }
                }
            });
        },
        // approve this job, when successful, publish an event to modify collection and view,
        approveJob: function(event) {
            event.preventDefault();
            var view = this;
            this.model.approve({
                silent: true,
                beforeSend: function() {
                    view.blockItem();
                },
                success: function() {
                    view.unblockItem();
                }
            });
        },
        // publish the event to call the modal edit job
        rejectJob: function(event) {
            event.preventDefault();
            pubsub.trigger('je:job:onReject', {model: this.model, itemView: this});
        },
        // event handler: click on archive button
        archiveJob: function(event) {
            var view = this;
            event.preventDefault();
            this.model.archive({silent: true,
                beforeSend: function() {
                    view.blockItem();
                },
                success: function() {
                    view.unblockItem();
                }
            });
        },
        editJob: function(event) {
            event.preventDefault();
            if (!this.model.has('id')) {
                this.model.set('id', this.model.get('id'), {silent: true});
            }
            //console.log(this.model.get('id'));
            pubsub.trigger('je:job:onEdit', this.model);
        }
    });
// Modal Edit Job
    JobEngine.Views.Modal_Edit_Job = JobEngine.Views.Modal_Box.extend({
        el: 'div#modal_edit_job',
        events: {
            'click a#edit-single-job': 'openModal',
            'click div.modal-close': 'closeModal',
            'keyup input#full_location': 'geocoding',
            'blur input#full_location, click div#submit-form'   : 'resetLocation',
            //'click a#save-jobe-single': 'submitForm',
            // 'click #add_sample' 					: 'editSample',
            // 'change #add_sample_input' 				: 'changeAddress',
            'click .apply input:radio': 'switchApplyMethod',
            'change #user_url': 'autoCompleteUrl'
        },
        initialize: function() {
            JobEngine.Views.Modal_Box.prototype.initialize.apply(this, arguments);
            var that = this,
                    $user_logo = this.$('#user_logo_container');
            _.bindAll(this);
            var blockUi = new JobEngine.Views.BlockUi();
            this.logo_uploader = new JobEngine.Views.File_Uploader({
                el: $user_logo,
                uploaderID: 'user_logo',
                thumbsize: 'company-logo',
                multipart_params: {
                    _ajax_nonce: $user_logo.find('.et_ajaxnonce').attr('id'),
                    action: 'et_logo_upload'
                },
                cbUploaded: function(up, file, res) {
                    if (res.success) {
                        that.model.author.set('user_logo', res.data, {silent: true});
                    } else {
                        pubsub.trigger('je:notification', {
                            msg: res.msg,
                            notice_type: 'error'
                        });
                    }
                },
                beforeSend: function(element) {
                    blockUi.block($user_logo.find('.thumbs'));
                },
                success: function() {
                    blockUi.unblock();
                }
            });
            pubsub.on('je:job:afterEditJob', this.closeModal, this);
            this.bind('waiting', this.waiting, this);
            this.bind('endWaiting', this.endWaiting, this);
        },
        onEdit: function(job_model, author) {

            author = author || null;
            if (job_model instanceof JobEngine.Models.Job && job_model.has('id') &&
                    (!(this.model instanceof JobEngine.Models.Job) || !this.model.has('id') || this.model.id !== job_model.id)) {
                this.model = job_model;
            }
            else {
                if (!this.model.has('id')) {
                    pubsub.trigger('je:notification', {
                        msg: 'Invalid Job ID',
                        notice_type: 'error'
                    });
                }
            }
            if (!(this.model.has('id') &&
                    this.model.has('author_id') &&
                    this.model.has('title') &&
                    this.model.has('content') &&
                    this.model.has('location') &&
                    this.model.has('categories') &&
                    this.model.has('job_types'))
                    ) {

                this.model.fetch({silent: true, success: this.setupFieldsAndOpenModal});
            }
            else {
                if (!(this.model.author.has('display_name') &&
                        this.model.author.has('user_url') &&
                        this.model.author.has('user_logo'))
                        ) {
                    if (author !== null) {
                        this.model.author.set(author, {silent: true});
                        this.setupFieldsAndOpenModal();
                    }
                    else {
                        this.model.author.set('id', this.model.get('author_id'), {silent: true});
                        this.model.author.fetch({silent: true, success: this.setupFieldsAndOpenModal});
                    }
                }
                else {
                    this.setupFieldsAndOpenModal();
                }
            }
        },
        setupFieldsAndOpenModal: function() {

            var that = this;
            this.logo_uploader.updateConfig({
                multipart_params: {
                    author: this.model.author.get('id')
                },
                updateThumbnail: true,
                data: this.model.author.get('user_logo')
            });
            this.openModal();
            this.setupFields(this.model);
            // keep the categories & status of the job before editting
            this.model.set('prev_cats', jQuery.map(this.model.get('categories'), function(cur, i) {
                return cur.slug;
            }), {silent: true});
            this.model.set('prev_status', this.model.get('status'), {silent: true});
            this.initMap();
            this.initValidator();
            this.validator.resetForm();
            // setup map
            if (typeof GMaps !== 'undefined' && typeof this.map.refresh === 'function') {
                this.map.refresh();
                if (this.model.has('location_lat') && this.model.has('location_lng')) {
                    GMaps.geocode({
                        lat: this.model.get('location_lat'),
                        lng: this.model.get('location_lng'),
                        callback: function(results, status) {
                            if (status == 'OK') {
                                var latlng = results[0].geometry.location;
                                that.map.setCenter(latlng.lat(), latlng.lng());
                                that.map.markers = [];
                                that.map.addMarker({
                                    lat: latlng.lat(),
                                    lng: latlng.lng(),
                                    draggable: true,
                                    dragend: function(e) {
                                        that.$('#location_lat').val(this.position.lat());
                                        that.$('#location_lng').val(this.position.lng());
                                    }
                                });
                                that.$('#location_lat').val(latlng.lat());
                                that.$('#location_lng').val(latlng.lng());
                            }
                        }
                    });
                }
            }
        },
        initMap: function() {
// init the map for location input only when it is not initialized
            if (typeof this.map === 'undefined' && typeof GMaps !== 'undefined') {
                this.map = new GMaps({
                    div: '#map',
                    lat: 10.7966064,
                    lng: 106.6902172,
                    zoom: 12,
                    panControl: false,
                    zoomControl: false,
                    mapTypeControl: false
                });
            }
        },
        initValidator: function() {
            if (typeof this.validator === 'undefined') {
                this.validator = this.$('form#job_form').validate({
                    ignore: "select, .plupload input",
                    rules: {
                        title: "required",
                        //location		: "required",
                        content: "required",
                        display_name: "required",
                        user_url: {
                            required: true,
                            url: true
                        }
                    }
                });
            }
        },
        setupFields: function(model) {
            var $jobinfo = this.$('div#job-details'),
                    $authorinfo = this.$('div#company-details'),
                    job_types = model.get('job_types'),
                    categories = model.get('categories'),
                    status = model.get('status'),
                    $status = $jobinfo.find('select#job_status'),
                    job_type, category;

            if (_.isArray(job_types) && typeof job_types[0] != 'undefined' && 'slug' in job_types[0]) {
                job_type = job_types[0].slug;
            }

            if (_.isArray(categories) && typeof categories[0] != 'undefined' && 'slug' in categories[0]) {
                category = categories[0].slug;
            }
            var job_types = $('#job-details select#job_types').val();
            var job_id = $('#job-details input#id').val();
            var params = {
                type: 'POST',
                dataType: 'html',
                url: et_globals.ajaxURL,
                data: {
                    action: 'et_conditions_sync',
                    job_types: job_types,
                    job_id : job_id
                },
                success: function(data) {
                    $("#load_conditions_by_job_type").html(data);
                }
            };
            jQuery.ajax(params);
            //console.log(model.toJSON());
            setTimeout(function() {
                $('input#id').val(model.get('ID'));
                $('input#status').val(model.get('status'));
                $('input#featured').val(model.get('featured'));
                $('input#author_id').val(model.get('author_id'));
                $('input#title').val(model.get('title'));
                $('input#location').val(model.get('location'));
                $("#full_location").val(model.get('full_location'));
                $('#location_lat').val(model.get('location_lat'));
                $('#location_lng').val(model.get('location_lng'));
                $('select#job_types').val(job_type).change();
                $('select#categories').val(category).change();
                $('#add_sample').html('"' + model.get('location') + '"');
                $('input#add_sample_input').val(model.get('location'));
                $('input#apply_email').val(model.get('apply_email'));

                $('input#apply_method').val(model.get('apply_method'));
                $('input#display_name').val(model.author.get('display_name'));
                $('input#user_url').val(model.author.get('user_url'));

                // set apply method for job
                if (model.get('apply_method') == 'ishowtoapply') {
                    $('#ishowtoapply').attr('checked', true);
                    $('#applicant_detail').addClass('required');
                } else {
                    $('#isapplywithprofile').attr('checked', true);
                    $('#apply_email').addClass('required email');
                }


                if ($status.length !== 0) {
                    $status.val(status).change();
                }

                tinyMCE.get('content').setContent(model.get('content'));
                tinyMCE.get('applicant_detail').setContent(model.get('applicant_detail'));

                pubsub.trigger('je:job:modal_edit:afterSetupFields', model, $jobinfo);
            }, 500);
        },
        geocoding: function(event) {
            var that = this,
                    $location = $(event.currentTarget);
            if (typeof this.t !== 'undefined') {
                clearTimeout(this.t);
            }

            this.t = setTimeout(function() {
                GMaps.geocode({
                    address: $location.val().trim(),
                    callback: function(results, status) {
                        if (status === 'OK') {
                            var latlng = results[0].geometry.location;
                            that.map.setCenter(latlng.lat(), latlng.lng());
                            that.map.removeMarkers();
                            that.map.addMarker({
                                lat: latlng.lat(),
                                lng: latlng.lng(),
                                draggable: true,
                                dragend: function(e) {
                                    that.$('#location_lat').val(this.position.lat());
                                    that.$('#location_lng').val(this.position.lng());
                                }
                            });
                            that.$('#location_lat').val(latlng.lat());
                            that.$('#location_lng').val(latlng.lng());
                            /*
                             var length			= results[0].address_components.length,
                             address			= results[0].address_components,
                             full_address	= results[0].formatted_address,
                             district		=	' ', city	=	' ', i;
                             
                             // find address area level 1 and level 2
                             for ( i =0; i< length; i++) {
                             if(address[i].types[0] == 'administrative_area_level_2' && address[i].long_name !== 'undefined') {
                             district = address[i].long_name + ', ';
                             }
                             if(address[i].types[0] == 'administrative_area_level_1' && address[i].long_name !== 'undefined') {
                             city = address[i].long_name;
                             }
                             }
                             
                             $('#location').val(district + city);
                             //$('.address-note span').html('"' + district + city + '"');
                             //$location.val(district + city);
                             //$locationtxt.html('"' + district + city + '"');
                             */
                        }
                    }
                });
            }, 500);
        },
        resetLocation: function(event) {
            var $full = $(event.currentTarget),
                    lat = this.$('#location_lat').val(),
                    lng = this.$('#location_lng').val(),
                    $location = this.$('#location');
            //$locationtxt	=	this.$('.address-note span');
            if (typeof GMaps !== 'undefined') {
                GMaps.geocode({
                    lat: lat,
                    lng: lng,
                    callback: function(results, status) {
                        if (status == 'OK') {
                            var length = results[0].address_components.length,
                                    address = results[0].address_components,
                                    full_address = results[0].formatted_address,
                                    district = ' ', city = ' ', i;
                            // find address area level 1 and level 2
                            for (i = 0; i < length; i++) {
                                if (address[i].types[0] == 'administrative_area_level_2' && address[i].long_name !== 'undefined') {
                                    district = address[i].long_name + ', ';
                                }
                                if (address[i].types[0] == 'administrative_area_level_1' && address[i].long_name !== 'undefined') {
                                    city = address[i].long_name;
                                }
                            }

                            $location.val(district + city);
                            //$locationtxt.html('"' + district + city + '"');
                            //$full.val(full_address);
                        }
                    }
                });
            }
        },
        /**
         * Display input field for company to change their address
         */
        editSample: function(event) {
            event.preventDefault();
            var target = $(event.currentTarget),
                    container = target.parent(),
                    content = target.html().substring(1, target.html().length - 1),
                    input = container.find('input').hide().val(content);
            // reset click
            $('body').unbind('click');
            $('body').bind('click', function(e) {
                if (e.target != event.currentTarget
                        && e.target != input[0]
                        && $.contains(e.currentTarget, input[0])) {
                    input.hide();
                    target.html('"' + input.val() + '"').show();
                    container.removeClass('editing');
                }
            });
            target.hide();
            container.append(input.show()).addClass('editing');
        },
        changeAddress: function(event) {
            $('#location').val($(event.currentTarget).val());
        },
        waiting: function() {
            this.title = this.$el.find('#submit-form').val();
            this.$el.find('#submit-form').val(et_globals.loading);
        },
        endWaiting: function() {
            this.$el.find('#submit-form').val(this.title);
        },
        submitForm: function(e) {
            e.preventDefault();
            //console.log('vao roi');
            this.validator = this.$('form#job_form').validate({
                ignore: "",
                rules: {
                    title: "required",
                    //full_location	: "required",
                    display_name: "required",
                    content: "required",
                    user_url: {
                        required: true,
                        url: true
                    }
                },
                errorPlacement: function(label, element) {
                    // position error label after generated textarea
                    if (element.is("textarea")) {
                        label.insertAfter(element.next());
                    } else {
                        label.insertAfter(element)
                    }
                }
            });
            var jobData = {},
                    companyData = {},
                    $jobInfo = this.$('div#job-details'),
                    $companyInfo = this.$('div#company-details'),
                    $status = $jobInfo.find('select#job_status'),
                    view = this;
            //tinyMCE.triggerSave();
            if (this.$('form#job_form').valid()) {

                $companyInfo.find('input').each(function() {
                    var $this = jQuery(this);
                    companyData[$this.attr('id')] = $this.val();
                });
                this.model.author.set(companyData);
                $jobInfo.find('input[type!=radio],textarea,select').each(function() {
                    var $this = jQuery(this);
                    jobData[$this.attr('id')] = $this.val();
                });
                $jobInfo.find('input[type=radio]:checked').each(function() {
                    var $this = jQuery(this);
                    jobData[$this.attr('id')] = $this.val();
                });

                jobData['job_types'] = [{slug: $jobInfo.find('select#job_types').val()}];
                jobData['categories'] = [{slug: $jobInfo.find('select#categories').val()}];
                if ($status.length !== 0) {
                    jobData['status'] = $status.val();
                }

                jobData['raw'] = view.$el.find('#job_form').serialize();
                var loadingBtn = new JobEngine.Views.LoadingButton({el: this.$el.find('#submit-form')});
                this.model.set(jobData, {silent: true})
                        .save({}, {
                    wait: true, // wait for server to response before rendering the job item again
                    author_sync: true,
                    beforeSend: function() {
                        loadingBtn.loading();
                    },
                    success: function(model, res) {
                        loadingBtn.finish();
                        if (res.success) {
                            pubsub.trigger('je:job:afterEditJob', model);
                            pubsub.trigger('je:notification', {
                                msg: res.msg,
                                notice_type: 'success'
                            });
                            pubsub.trigger('je:job:onAuthorChanged:' + model.author.get('id'), model.author.toJSON());
                        }
                        else {
                            pubsub.trigger('je:notification', {
                                msg: res.msg,
                                notice_type: 'error'
                            });
                        }
                    }
                });
            } else {
                pubsub.trigger('je:notification', {
                    msg: et_globals.form_valid_msg,
                    notice_type: 'error'
                });
            }
        },
        switchApplyMethod: function(event) {
//event.preventDefault();
            var apply_method = $(event.currentTarget).val();
            if (apply_method == 'isapplywithprofile') {
                $('#apply_email').addClass('required email');
                $('#applicant_detail').removeClass('required');
                $('.applicant_detail').removeClass('error');
            }

            if (apply_method == 'ishowtoapply') {
                $('#applicant_detail').addClass('required');
                $('#apply_email').removeClass('required');
                $('.email_apply').removeClass('error');
            }
            $('.apply').find('.icon').remove();
            $('.apply').find('.message').remove();
            $('#apply_method').val(apply_method);
        },
        autoCompleteUrl: function(event) {
            var val = $(event.currentTarget).val();
            if (val.length == 0) {
                return true;
            }

// if user has not entered http:// https:// or ftp:// assume they mean http://
            if (!/^(https?|ftp):\/\//i.test(val)) {
                val = 'http://' + val; // set both the value
                $(event.currentTarget).val(val); // also update the form element
                $(event.currentTarget).focus();
            }
        }
    });
// Modal Login
    JobEngine.Views.Modal_Login = JobEngine.Views.Modal_Box.extend({
        el: '#modal_login',
        events: {
            'click div.modal-close': 'closeModal',
            'click a.cancel-modal': 'closeModal',
            'submit form#login': 'doLogin',
            'click a.forgot-pass-link': 'openForgotPassword',
            'click a.register-link': 'openRegister'
        },
        initialize: function() {
            JobEngine.Views.Modal_Box.prototype.initialize.apply(this, arguments);
            this.options = _.extend(this.options, this.defaults);
            this.initValidator();
            this.title = this.$el.find('button#submit_login').val();
            pubsub.on('je:request:auth', this.openModalAuth, this);
            pubsub.on('je:response:auth', this.afterLogin, this);
            //pubsub.on('je:request:waiting', this.waiting, this);
            this.bind('waiting', this.waiting, this);
            this.bind('endWaiting', this.endWaiting, this);
            this.loadingBtn = new JobEngine.Views.LoadingButton({el: this.$('button#submit_login1')});
            //console.log ('modal login init');
        },
        openModalAuth: function() {
            this.openModal();
            this.initValidator();
        },
        setOptions: function(options) {
            this.options = _.extend(options, this.options);
        },
        initValidator: function() {
            if (typeof this.validator === 'undefined') {
                this.validator = this.$('form#login').validate({
                    rules: {
                        log_email: {
                            required: true
                        },
                        log_pass: "required"
                    }
                });
            }
        },
        waiting: function() {
            this.$('button#submit_login1').show();
            this.$('button#submit_login').hide();
            
            this.loadingBtn.loading();
        },
        endWaiting: function() {
            this.$('button#submit_login').show();
            this.$('button#submit_login1').hide();
            
            this.loadingBtn.finish();
        },
        doLogin: function(event) {
            event.preventDefault();
            // get the submitted form & its id
            var $target = this.$(event.currentTarget),
                    $container = $target.closest('form'),
                    form_type = $target.attr('id'),
                    view = this;
            var options = this.options;
            view.trigger('waiting');
            if (this.validator.form()) {
// update the auth model before submiting form
                JobEngine.app.auth.setUserName($target.find('input#log_email').val());
                JobEngine.app.auth.setEmail($target.find('input#log_email').val());
                JobEngine.app.auth.setPass($target.find('input#log_pass').val());
                JobEngine.app.auth.doAuth(form_type, options);
            }
        },
        afterLogin: function(data, status, jqXHR) {
// change the title 'loading' of the button
            this.trigger('endWaiting');
            // check if authentication is successful or not
            if (data.status) {
                this.closeModal();
                
                if ($('#je_jobmap').length > 0){
                    setTimeout(function(){
                        window.location.href = '/dashboard';
                    }, 100);    
                }
            }
            else {
// display error here
            }
        },
        openForgotPassword: function(e) {
            e.preventDefault();
            this.closeModal(200, function() {
                pubsub.trigger('je:request:forgot_pass');
            });
        },
        openRegister: function(e) {
            e.preventDefault();
            this.closeModal(200, function() {
                pubsub.trigger('je:request:register');
            });
        }
    });
    JobEngine.Views.Modal_Register = JobEngine.Views.Modal_Box.extend({
        el: '#modal-register',
        events: {
            'click div.modal-close': 'closeModalRegister',
            'submit form#register': 'doRegister'
        },
        initialize: function() {
            JobEngine.Views.Modal_Box.prototype.initialize.apply(this, arguments);
            this.options = _.extend(this.options, this.defaults);
            // events of modals
            pubsub.on('je:request:register', this.openModalRegister, this);
            pubsub.on('je:response:auth', this.afterLogin, this);
        },
        openModalRegister: function() {
            this.openModal();
            this.initValidator();
        },
        closeModalRegister: function() {
            this.closeModal();
            $('#modal_login').show();
        },
        initValidator: function() {
            if (typeof this.validator === 'undefined') {
                this.validator = this.$('form#register').validate({
                    rules: {
                        reg_name: {required: true, usernameCheck: true},
                        reg_email: {
                            required: true,
                            email: true
                        },
                        reg_pass: "required",
                        reg_pass_again: {
                            required: true,
                            equalTo: "#reg_pass"
                        }
                    },
                    messages: {
                        reg_name: {
                            usernameCheck: et_globals.err_invalid_username
                        }
                    }
                });
            }
        },
        doRegister: function(event) {
            event.preventDefault();
            var $container = $('#modal-register');
            //user_name	=	$container.find('input#reg_name').val(),
            // 	div			=	$container.find('input#reg_name').parents('.name');
            // 	console.log (div);
            // if(!user_name.match ('/[0-9a-zA-Z_]+/')) {
            // 	div.addClass ('error');
            // 	var error	=	'<span class="icon" data-icon="!"></span>'+
            // 					'<div for="reg_name" generated="true" class="message" style="">'+et_globals.err_invalid_username+'</div></div>';
            // 	div.append (error);
            // } else {

            // }

            if (this.validator.form()) {
                var $target = this.$(event.currentTarget),
                        form_type = $target.attr('id'),
                        view = this,
                        result;
                JobEngine.app.auth.setUserName($container.find('input#reg_name').val());
                JobEngine.app.auth.setEmail($container.find('input#reg_email').val());
                JobEngine.app.auth.setPass($container.find('input#reg_pass').val());
                result = JobEngine.app.auth.doAuth(form_type, {
                    renew_logo_nonce: true,
                    beforeSend: function() {
                        view.loadingBtn = new JobEngine.Views.LoadingButton({el: $target.find('input[type=submit]')});
                        view.loadingBtn.loading();
                    },
                    success: function(response) {
                        view.loadingBtn.finish();
                    }
                });
            }
        },
        afterLogin: function(data, status, jqXHR) {
// change the title 'loading' of the button
            this.trigger('endWaiting');
            // check if authentication is successful or not
            if (data.status) {
                this.closeModal();
            }
            else {
// display error here
            }
        }


    });
    JobEngine.Views.Modal_Forgot_Pass = JobEngine.Views.Modal_Box.extend({
        el: '#modal-forgot-pass',
        events: {
            'click div.modal-close': 'closeModalForgotPass',
            'submit form#forgot_pass': 'requestResetPassword'
        },
        initialize: function() {
            JobEngine.Views.Modal_Box.prototype.initialize.apply(this, arguments);
            this.options = _.extend(this.options, this.defaults);
            this.title = this.$el.find('.button > input.bg-btn-action').val();
            pubsub.on('je:request:forgot_pass', this.openModalPass, this);
            pubsub.on('je:response:request_reset_password', this.afterResetPassword, this);
            pubsub.on('je:request:requestResetPassWaiting', this.waiting, this);
            //this.bind('waiting', this.waiting, this);
            this.bind('endWaiting', this.endWaiting, this);
            this.loadingBtn = new JobEngine.Views.LoadingButton({el: this.$('.button > input.bg-btn-action')});
        },
        closeModalForgotPass: function() {
            this.closeModal();
            $('#modal_login').show();
        },
        openModalPass: function() {
            this.openModal();
            this.initValidator();
        },
        initValidator: function() {
            if (typeof this.validator === 'undefined') {
                this.validator = this.$('form#forgot_pass').validate({
                    forgot_email: {
                        required: true,
                        email: true
                    }
                });
            }
        },
        waiting: function() {
            this.loadingBtn.loading();
        },
        endWaiting: function() {
            this.loadingBtn.finish();
            //this.$el.find('.button > input.bg-btn-action').val(this.title);
        },
        requestResetPassword: function(e) {
            e.preventDefault();
            // get the submitted form & its id
            var $target = this.$(e.currentTarget);
            if (this.validator.form()) {
                JobEngine.app.auth.setEmail($target.find('input#forgot_email').val());
                JobEngine.app.auth.doRequestResetPassword();
            }
        },
        afterResetPassword: function(data, status) {
            this.trigger('endWaiting');
            if (data.success){
                this.closeModal();
                $('#modal_login').show();
            }
        }
    });
    /*************************************************
     //                                              //
     //              INTERFACE SCRIPTS               //
     //                                              //
     *************************************************/
    /**
     * @author Hanux
     */

    jQuery(document).ready(function($) {

// when the document is ready, init the app view
        JobEngine.app = new JobEngine.Views.App();
        /*
         ==========================================================================================================
         Function fix position header
         author: hanux
         ========================================================================================================== */

        // available fixed windows
        var jbody = jQuery("body"),
                headertop = jQuery('.main-header'),
                filter = jQuery('#header-filter'),
                wrapper = jQuery('#wrapper');
        // style select input of step 2 form
        jQuery('.select-style:not(.styled) select').each(function() {
            var $this = jQuery(this),
                    title = $this.attr('title'),
                    selectedOpt = $this.find('option:selected');
            container = $this.parent();
            //if( selectedOpt.val() !== '' ){
            title = selectedOpt.text();
            //}
            container.children('span.select').remove();
            $this.css({'z-index': 10, 'opacity': 0, '-khtml-appearance': 'none'})
                    .after('<span class="select">' + title + '</span>')
                    .change(function() {
                var val = jQuery('option:selected', this).text();
                jQuery(this).next().text(val);
            });
            $this.parent().addClass('styled');
        });
        // render all tooltips
        jbody
                .on('mouseenter', '.tooltip',
                function() {
                    var $this = jQuery(this),
                            dwidth, $tooltip;
                    this.tip = this.title;
                    $this.append(
                            '<div class="tooltip-wrapper">' +
                            '<div class="tooltip-content">' +
                            this.tip +
                            '</div>' +
                            '<div class="tooltip-btm"></div>' +
                            '</div>'
                            );
                    this.title = "";
                    // this.height = $this.height();
                    this.width = $this.width();
                    $tooltip = $this.find('.tooltip-wrapper');
                    $tooltip.css({"width": this.tip.length * 8 + 15 + "px"});
                    $tooltip
                            .css({
                        "left": this.width / 2 - $tooltip.width() / 2 + "px",
                        "top": -($tooltip.height() + 5) + "px"
                    })
                            .fadeIn(300);
                }
        )
                .on('mouseleave', '.tooltip',
                function() {
                    jQuery(this).find('.tooltip-wrapper').fadeOut(50, function() {
                        jQuery(this).remove();
                    });
                    this.title = this.tip;
                }
        );
        if (filter.length) {
// jbody.addClass('margin-top-145');
        }



// always show header-bar
        if ($('#wpadminbar').length > 0) {


            if (headertop.length > 0) {

// headertop.addClass('top-28');			
// jbody.addClass('margin-top-70');

            }

            if (filter.length) {
// filter.addClass('top-98');
// jbody.addClass('margin-top-145');

            }
        } else {

            if (headertop.length > 0) {

// headertop.addClass('top-0');	

            }
            if (filter.length) {
// filter.addClass('top-70');


            } else {
// jbody.addClass('margin-top-70');
            }
        }

// enable multilevel category
        jQuery('.category-lists .sym-multi').click(function() {
            var $this = jQuery(this);
            if ($this.hasClass("sym-multi-expand")) {
                $this.removeClass("sym-multi-expand");
            }
            else {
                $this.addClass("sym-multi-expand");
            }

            $this.next("ul").slideToggle();
        });
        jQuery('.category-lists li a').each(function() {
            var $this = jQuery(this);
            if ($this.hasClass("active")) {
                $this.parents("ul").show();
            }
        });
        // check placeholder browser support
        if (Modernizr && !Modernizr.input.placeholder) {

// set placeholder values var_dump($post);
            jQuery('[placeholder]')
                    .each(function() {
                var $this = jQuery(this);
                if ($this.val() === '') {
                    $this.val($this.attr('placeholder'));
                }
            })
                    .focus(function() {
                var $this = jQuery(this);
                if ($this.val() === $this.attr('placeholder')) {
                    $this.val('');
                    $this.removeClass('placeholder');
                }
            })
                    .blur(function() {
                var $this = jQuery(this);
                if ($this.val() === '' || $this.val() === $this.attr('placeholder')) {
                    $this.val($this.attr('placeholder'));
                    $this.addClass('placeholder');
                }
            })

                    .closest('form').submit(function() { // remove placeholders on submit
                var $form = jQuery(this);
                $form.find('[placeholder]').each(function() {
                    var $this = jQuery(this);
                    if ($this.val() === $this.attr('placeholder')) {
                        $this.val('');
                    }
                });
            });
        }

        /*	
         if ( wrapper.height() < jQuery(window).height()){
         // run this in the footer
         wrapper.css( 'min-height', wrapper.height() + ( jQuery(window).height() - jQuery('body').outerHeight(true) ) );
         // remove spacing if admin bar is visible
         if ($('#wpadminbar').length > 0)
         wrapper.css('min-height', wrapper.height() - 28);
         }
         */
        $(".sortable").sortable({
            connectWith: ".sortable",
            axis: "y",
            cursor: "move",
            cursorAt: {left: 5},
            opacity: 0.7,
            stop: function(event, ui) {
                var $item = ui.item,
                        widgets = $item.parents('.sortable').sortable("toArray"),
                        blockUI = new JobEngine.Views.BlockUi();
                $.ajax({
                    type: 'POST',
                    url: et_globals.ajaxURL,
                    data: {
                        sidebar: $item.parents('.sortable').attr('id'),
                        action: 'et-sort-sidebar-widget',
                        widget: widgets
                    },
                    beforeSend: function() {
                        blockUI.block($item.parents('.sortable'));
                    },
                    success: function(res) {
                        blockUI.unblock();
                    }

                });
            },
            handle: '.sort-handle'
        });
        jQuery.validator.addMethod("usernameCheck", function(username) {
            return username.match('^([a-zA-Z0-9_.]+@){0,1}([a-zA-Z0-9_.])+$');
        });
        $.validator.addMethod('accept', function() {
            return true;
        });
    });
})(jQuery);