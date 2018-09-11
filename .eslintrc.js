module.exports = {
  parser: "babel-eslint",
  plugins: [
    "babel",
    "import"
  ],
  env: {
    "browser": true,
    "node": true,
    "jest": true,
  },
  extends: [
    "airbnb"
  ],
  globals: {
    "__DEV__": true,
  },
  rules: {
    "indent": ["error", 2],
    "babel/semi": "error",
    "babel/no-invalid-this": "error",
    "babel/object-curly-spacing": "off",
    "babel/quotes": "off",
    "babel/no-unused-expressions": "error",
    "import/no-extraneous-dependencies": "off",
    "import/prefer-default-export": "off",
    "import/extensions": "off",
    "import/no-unresolved": "off",
    "import/exports-last": "error",
    "import/no-namespace": "error",
    "jsx-a11y/anchor-is-valid": "off",
    "jsx-a11y/label-has-for": "off",
    "react/jsx-filename-extension": "off",
    "react/prefer-stateless-function": "off",
    "no-prototype-builtins": "off",
    "no-class-assign": "error",
    "no-param-reassign": "off",
    "no-underscore-dangle": "off",
    "class-methods-use-this": "off",
    "object-curly-newline": "off",
    "guard-for-in": "off",
    "consistent-return": "off",
    "react/forbid-prop-types": "off",
    "react/sort-comp": "off",
    "react/no-unused-state": "off",
    "arrow-parens": ["error", "always"],
    "quote-props": ["error", "consistent-as-needed"],
    "object-shorthand": ["error", "consistent-as-needed"],
    "no-restricted-syntax": ["off", "ForInStatement"],
    "linebreak-style": ["error", "unix"],
    "no-multiple-empty-lines": "error",
    "no-trailing-spaces": ["error"],
    "react/prop-types": ["error", {
      ignore: ["actions", "context"]
    }],
    "no-multiple-empty-lines": ["error",
      { "max": 1, "maxEOF": 1 }
    ],
    "prefer-destructuring": ["error", {
      AssignmentExpression: {"array": true, "object": true }
    }],
    "quotes": ["warn", "single", {
      allowTemplateLiterals: true
    }],
    "padded-blocks": ["warn", {
      classes:"always"
    }],
    "no-unused-vars": ["error", {
      args: "none"
    }]
  }
}
