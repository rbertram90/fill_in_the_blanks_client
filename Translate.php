<?php

class Translate
{

    public static $language = 'en';
    protected static $translations = [];
    public static $checked = false;

    public static function t($string, $return = false)
    {
        if (count(self::$translations) == 0 && !self::$checked && self::$language!='en') {
            // Only try to load the translations once
            self::$translations = include __DIR__ .'/lang/'. self::$language .'.php';
            self::$checked = true;
        }

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
        return self::$translations;
    }
}