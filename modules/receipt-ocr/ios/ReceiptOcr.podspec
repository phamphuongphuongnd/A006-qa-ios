Pod::Spec.new do |s|
  s.name           = 'ReceiptOcr'
  s.version        = '0.1.0'
  s.summary        = 'Sunday Sort on-device receipt OCR (Vision)'
  s.description    = 'Sunday Sort on-device receipt OCR (Vision)'
  s.author         = ''
  s.homepage       = 'https://github.com/phamphuongphuongnd/A006-sundaysort'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,swift}'
end
