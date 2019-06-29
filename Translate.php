<?php

class Translate
{

    public static $language = 'en';
    protected static $translations = [];
    public static $checked = false;

    public static function t($string, $return = false)
    {
        self::getTranslations();

        if (array_key_exists($string, self::$translations)) {
            if ($return) {
                return self::$translations[$string];
            }
            print self::$translations[$string];
        }
        else {
            if ($return) {
                return $string;
            }
            print $string;
        }
    }

    public static function getTranslations() {
        if (count(self::$translations) == 0 && !self::$checked && self::$language!='en') {
            // Only try to load the translations once
            if (file_exists(__DIR__ .'/lang/'. self::$language .'.php')) {
                self::$translations = include __DIR__ .'/lang/'. self::$language .'.php';
            }
            self::$checked = true;
        }
        return self::$translations;
    }
}