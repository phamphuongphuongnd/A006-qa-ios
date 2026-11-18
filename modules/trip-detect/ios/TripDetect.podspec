Pod::Spec.new do |s|
  s.name           = 'TripDetect'
  s.version        = '0.1.0'
  s.summary        = 'Sunday Sort automatic trip signals (CoreMotion + significant location changes)'
  s.description    = 'Sunday Sort automatic trip signals (CoreMotion + significant location changes)'
  s.author         = ''
  s.homepage       = 'https://github.com/phamphuongphuongnd/A006-sundaysort'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreMotion', 'CoreLocation'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,swift}'
end
