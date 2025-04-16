// webpack.config.js

import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

export default {
    entry: {
        main: './src/app.js'  // Updated path to new entry point
    },
    output: {
        path: path.resolve('public'),
        filename: '[name].bundle.js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[hash:8][ext]'
                }
            },
            {
                test: /\.(png|svg)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'icons/[name].[hash:8][ext]'
                }
            },
            {
                test: /favicon\.ico$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'favicon.ico'
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/html/index.html',
            favicon: './src/media/favicon.ico',
            minify: false
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash:8].css'
        })
    ],
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            // Add shortcut for imports
            '@': path.resolve(process.cwd(), 'src')
        }
    },
    devServer: {
        static: {
            directory: path.join(process.cwd(), 'public')
        },
        compress: true,
        hot: true,
        port: 9002
    },
    optimization: {
        minimize: false // Disable minimization for development
    }
}
