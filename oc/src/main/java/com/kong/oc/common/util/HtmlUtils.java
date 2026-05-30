package com.kong.oc.common.util;

import lombok.experimental.UtilityClass;

@UtilityClass
public class HtmlUtils {

    public static String escape(String value) {
        return value == null
                ? ""
                : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
