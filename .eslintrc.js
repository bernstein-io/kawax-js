module.exports = {
  parser: "babel-eslint",
  plugins: [
    "babel",
    "import"
  ],
  env: {
    "browser": true,
    "jest": true,
  },
  extends: [
    "airbnb"
  ],
  globals: {
    "__DEV__": true,
  },
  rules: {
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
    "react/jsx-filename-extension": "off",
    "react/prefer-stateless-function": "off",
    "no-underscore-dangle": "off",
    "no-prototype-builtins": "off",
    "no-class-assign": "error",
    "no-param-reassign": "off",
    "class-methods-use-this": "off",
    "object-curly-newline": "off",
    "guard-for-in": "off",
    "consistent-return": "off",
    "react/forbid-prop-types": "off",
    "react/sort-comp": "off",
    "arrow-parens": ["error", "always"],
    "no-restricted-syntax": ["off", "ForInStatement"],
    "comma-dangle": ["warn", "only-multiline"],
    "react/prop-types": ["error", {
      ignore: ["actions"]
    }],
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
