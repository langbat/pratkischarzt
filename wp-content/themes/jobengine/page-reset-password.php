<?php 
/**
 * Template Name: Passwort zurücksetzen
 */

global $current_user;
get_header(); ?>

<div class="heading">
	<div class="main-center">
		<h3 class="font-quicksand"><?php _e('Account', ET_DOMAIN) ?></h3>
		<!-- <div class="logout f-right">
			<a href="<?php echo wp_logout_url( home_url() ) ?>"><?php _e('Logout', ET_DOMAIN) ?> <span class="icon" data-icon="Q"></span></a>
		</div> -->
	</div>
</div>

<div id="page_reset_password" class="wrapper account-jobs account-step">
	<?php 
	/*<div class="account-title">
		<div class="main-center clearfix">
			<ul class="account-menu font-quicksand">
				<li><a href="<?php echo et_get_page_link('dashboard'); ?>"><?php _e('Your Jobs', ET_DOMAIN); ?></a></li>
				<li><a href="<?php echo et_get_page_link('profile'); ?>"><?php _e('Company Profile', ET_DOMAIN); ?></a></li>
				<li><a href="<?php echo et_get_page_link('password'); ?>" class="active"><?php _e('Password', ET_DOMAIN); ?></a></li>
			</ul>        
		</div>
	</div> */
	 ?>

	<?php 
	global $current_user, $wp_query;
	?>

	<div class="main-center">
		<div class="full-column account-content">
			<div class="form-account">
				<form id="reset_password" action="">
					<?php et_the_form( array(
						'login' => array( 
							'name' => 'user_login',
							'input_id'	=> 'user_login',
							'type' => 'hidden',
							'value' => empty($_GET['user_login']) ? '' : $_GET['user_login']
							),
						'key' => array( 
							'name' => 'user_key',
							'input_id'	=> 'user_key',
							'type' => 'hidden',
							'value' => empty($_GET['key']) ? '' : $_GET['key']
							),
						'user_new_pass' => array( 
							'name' => 'user_new_pass',
							'input_id'	=> 'user_new_pass',
							'title' => __('New Password', ET_DOMAIN),
							'type' => 'password',
							),
						'user_pass_again' => array(
							'name' => 'user_pass_again',
							'input_id'	=> 'user_pass_again',
							'title' => __('Retype New Password', ET_DOMAIN),
							'type' => 'password',
							)
						)); ?>
					<div class="line-hr"></div>
					<div class="form-item">
						<input id="submit_profile" class="bg-btn-action" type="submit" value="<?php _e('SAVE CHANGE', ET_DOMAIN); ?>" />
					</div> 
				</form>
			</div>        
		</div>		
	</div>
</div>

<?php get_footer(); ?>